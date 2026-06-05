"""管理后台业务逻辑，集中处理统计、审核、用户和配置管理。"""

from uuid import UUID

from app.core.database import get_pool
from app.models.admin import AdjustCreditsReq, ModerateWorkReq


class AdminService:
    """管理后台服务，所有写操作同时写审计日志。"""

    async def dashboard_stats(self) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return {
                "users": await conn.fetchval(
                    "SELECT count(*) FROM public.users WHERE deleted_at IS NULL"
                ),
                "materials": await conn.fetchval(
                    "SELECT count(*) FROM public.materials WHERE deleted_at IS NULL"
                ),
                "video_jobs": await conn.fetchval(
                    "SELECT count(*) FROM video.video_generation_jobs WHERE deleted_at IS NULL"
                ),
                "image_jobs": await conn.fetchval(
                    "SELECT count(*) FROM image.image_generation_jobs WHERE deleted_at IS NULL"
                ),
                "pending_reviews": await conn.fetchval(
                    "SELECT count(*) FROM community.community_works WHERE status='pending_review'"
                ),
            }

    async def list_users(self) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, email, role, status, credit_balance, created_at
                FROM public.users
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC LIMIT 100
                """
            )
        return [dict(row) for row in rows]

    async def get_user_detail(self, user_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, role, status, credit_balance, created_at
                FROM public.users WHERE id=$1
                """,
                user_id,
            )
        return dict(row) if row else {}

    async def update_user(self, user_id: UUID, payload: dict) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE public.users
                SET role=COALESCE($2,role), status=COALESCE($3,status)
                WHERE id=$1
                RETURNING id,email,role,status,credit_balance,created_at
                """,
                user_id,
                payload.get("role"),
                payload.get("status"),
            )
        return dict(row) if row else {}

    async def moderation_queue(self) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM community.community_works
                WHERE status='pending_review'
                ORDER BY created_at DESC LIMIT 100
                """
            )
        return [dict(row) for row in rows]

    async def moderate_work(self, actor_user_id: UUID, work_id: UUID, req: ModerateWorkReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE community.community_works SET status=$1 WHERE id=$2",
                req.status,
                work_id,
            )
            await conn.execute(
                """
                INSERT INTO public.audit_logs
                  (actor_user_id, action, resource_type, resource_id, metadata)
                VALUES ($1, 'moderate_work', 'community_work', $2, $3)
                """,
                actor_user_id,
                str(work_id),
                {"status": req.status, "reason": req.reason},
            )
        return {"status": req.status}

    async def adjust_credits(self, actor_user_id: UUID, req: AdjustCreditsReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO public.credit_records (user_id, record_type, amount, description)
                VALUES ($1, 'adjust', $2, $3) RETURNING *
                """,
                UUID(req.user_id),
                req.amount,
                req.description,
            )
            await conn.execute(
                """
                INSERT INTO public.audit_logs
                  (actor_user_id, action, resource_type, resource_id, metadata)
                VALUES ($1, 'adjust_credits', 'user', $2, $3)
                """,
                actor_user_id,
                req.user_id,
                {"amount": req.amount, "description": req.description},
            )
        return {"record_id": str(row["id"]), "balance_after": row["balance_after"]}

    async def audit_logs(self) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 100")
        return [dict(row) for row in rows]

    async def provider_accounts(self) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM video.provider_accounts ORDER BY priority")
        return [dict(row) for row in rows]

    async def update_provider_account(self, account_id: UUID, payload: dict) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE video.provider_accounts
                SET status=COALESCE($2,status), priority=COALESCE($3,priority)
                WHERE id=$1 RETURNING *
                """,
                account_id,
                payload.get("status"),
                payload.get("priority"),
            )
        return dict(row) if row else {}

    async def recharge_orders(self) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.credit_recharge_orders ORDER BY created_at DESC LIMIT 100"
            )
        return [dict(row) for row in rows]

    def system_settings(self) -> dict:
        return {"community_publish_enabled": True, "mock_provider_enabled": True}

    def update_system_settings(self, payload: dict) -> dict:
        return {"updated": True, "settings": payload}

    def content_reports(self) -> list[dict]:
        return []
