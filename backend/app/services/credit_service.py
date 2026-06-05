"""积分业务逻辑，包含原子扣减、预估、充值订单和 Stripe Webhook。"""

import json
from uuid import UUID, uuid4

import stripe

from app.config import get_settings
from app.core.database import get_pool, transaction
from app.core.exceptions import AppError
from app.core.provider_router import provider_router
from app.core.redis_client import app_key, get_redis
from app.models.credits import CreditDeductReq, CreditEstimateReq, RechargeOrderReq


class CreditService:
    """积分服务，所有扣费入口必须经过这里。"""

    async def get_balance(self, user_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT credit_balance, frozen_credits FROM public.users WHERE id=$1 AND deleted_at IS NULL",
                user_id,
            )
        if row is None:
            raise AppError("E004", "用户不存在", 404)
        return {
            "credit_balance": row["credit_balance"],
            "frozen_credits": row["frozen_credits"],
            "available_credits": row["credit_balance"] - row["frozen_credits"],
        }

    async def list_records(self, user_id: UUID, limit: int = 20, offset: int = 0) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, record_type, amount, balance_after, description, created_at
                FROM public.credit_records
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                user_id,
                limit,
                offset,
            )
        return [dict(row) for row in rows]

    async def deduct(self, user_id: UUID, req: CreditDeductReq) -> dict:
        redis = get_redis()
        lock = redis.lock(app_key(f"lock:credit:{user_id}"), timeout=30, blocking_timeout=5)
        if not lock.acquire():
            raise AppError("E101", "积分预冻结失败", 402)
        try:
            async with transaction() as conn:
                existing = await conn.fetchrow(
                    "SELECT * FROM public.credit_records WHERE idempotency_key=$1",
                    req.task_id,
                )
                if existing:
                    return dict(existing)
                row = await conn.fetchrow(
                    """
                    UPDATE public.users
                    SET credit_balance = credit_balance - $2
                    WHERE id=$1 AND credit_balance - frozen_credits >= $2
                    RETURNING credit_balance
                    """,
                    user_id,
                    req.amount,
                )
                if row is None:
                    raise AppError("E100", "积分余额不足", 402)
                record = await conn.fetchrow(
                    """
                    INSERT INTO public.credit_records
                      (user_id, task_id, record_type, amount, balance_after, description, idempotency_key)
                    VALUES ($1, $2, 'deduct', $3, $4, $5, $2)
                    RETURNING *
                    """,
                    user_id,
                    req.task_id,
                    -req.amount,
                    row["credit_balance"],
                    req.description,
                )
            return dict(record)
        finally:
            lock.release()

    async def create_recharge_order(self, user_id: UUID, req: RechargeOrderReq) -> dict:
        amount_cents = req.credits
        out_trade_no = f"cr_{uuid4().hex}"
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO public.credit_recharge_orders
                  (user_id, out_trade_no, credits, amount_cents, currency, status)
                VALUES ($1, $2, $3, $4, $5, 'pending')
                RETURNING id, out_trade_no, credits, amount_cents, currency, status
                """,
                user_id,
                out_trade_no,
                req.credits,
                amount_cents,
                req.currency,
            )
        data = dict(row)
        data["checkout_url"] = f"https://checkout.stripe.com/mock/{out_trade_no}"
        return data

    async def handle_stripe_webhook(self, raw_body: bytes, signature: str | None) -> dict:
        """校验 Stripe Webhook 并在 checkout 完成后幂等到账。"""
        event = self._parse_stripe_event(raw_body, signature)
        event_type = str(event.get("type", "unknown"))
        if event_type != "checkout.session.completed":
            return {"received": True, "event_type": event_type, "processed": False}

        session = event["data"]["object"]
        out_trade_no = session.get("client_reference_id") or session.get("metadata", {}).get("out_trade_no")
        if not out_trade_no:
            raise AppError("E001", "Stripe事件缺少订单号", 400)
        return await self._mark_recharge_paid(str(event["id"]), str(out_trade_no))

    def _parse_stripe_event(self, raw_body: bytes, signature: str | None) -> dict:
        """生产环境使用 Stripe 签名校验，本地无密钥时允许解析 mock 事件。"""
        settings = get_settings()
        if settings.stripe_webhook_secret:
            if not signature:
                raise AppError("E003", "Stripe签名缺失", 403)
            try:
                return stripe.Webhook.construct_event(
                    raw_body,
                    signature,
                    settings.stripe_webhook_secret,
                )
            except ValueError as exc:
                raise AppError("E001", "Stripe事件格式错误", 400) from exc
            except stripe.SignatureVerificationError as exc:
                raise AppError("E003", "Stripe签名校验失败", 403) from exc
        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise AppError("E001", "Stripe事件格式错误", 400) from exc

    async def _mark_recharge_paid(self, event_id: str, out_trade_no: str) -> dict:
        """将充值订单置为已支付并插入积分流水，event_id 保证幂等。"""
        async with transaction() as conn:
            existing = await conn.fetchrow(
                "SELECT * FROM public.credit_records WHERE idempotency_key=$1",
                event_id,
            )
            if existing:
                return {"received": True, "event_type": "checkout.session.completed", "processed": False}

            order = await conn.fetchrow(
                """
                UPDATE public.credit_recharge_orders
                SET status='paid', paid_at=COALESCE(paid_at, now())
                WHERE out_trade_no=$1 AND status IN ('pending','paid')
                RETURNING id, user_id, credits, status
                """,
                out_trade_no,
            )
            if order is None:
                raise AppError("E004", "充值订单不存在", 404)
            if order["user_id"] is None:
                raise AppError("E004", "充值订单用户不存在", 404)

            await conn.fetchrow(
                """
                INSERT INTO public.credit_records
                  (user_id, task_id, record_type, amount, description, idempotency_key)
                VALUES ($1, $2, 'recharge', $3, $4, $2)
                RETURNING *
                """,
                order["user_id"],
                event_id,
                order["credits"],
                f"Stripe充值到账 {out_trade_no}",
            )
        return {"received": True, "event_type": "checkout.session.completed", "processed": True}

    def estimate(self, req: CreditEstimateReq) -> dict:
        if req.task_type == "video":
            cost = provider_router.estimate_video_cost(req.model_id, req.duration_seconds)
        elif req.task_type == "image":
            cost = provider_router.estimate_image_cost(req.model_id, req.resolution)
        else:
            cost = 30 if req.tool_key == "enhance" else 0
        return {"estimated_credits": cost, "task_type": req.task_type, "model_id": req.model_id}
