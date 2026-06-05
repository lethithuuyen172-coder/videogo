"""积分 API 路由，提供余额、流水、预估、充值和 Webhook。"""

from fastapi import APIRouter, Depends, Request

from app.core.responses import ok
from app.models.credits import (
    CreditBalanceResp,
    CreditDeductReq,
    CreditEstimateReq,
    CreditEstimateResp,
    CreditRecordItem,
    RechargeOrderReq,
    RechargeOrderResp,
)
from app.routers.auth import get_current_user
from app.services.credit_service import CreditService

router = APIRouter(tags=["credits"])


def get_credit_service() -> CreditService:
    return CreditService()


@router.get("/balance")
async def balance(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """查询当前用户积分余额。"""
    data = await service.get_balance(current_user["id"])
    return ok(CreditBalanceResp(**data).model_dump(), request)


@router.get("/records")
async def records(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """查询积分流水。"""
    items = await service.list_records(current_user["id"])
    return ok([CreditRecordItem(**item).model_dump(mode="json") for item in items], request)


@router.post("/estimate")
async def estimate(
    req: CreditEstimateReq,
    request: Request,
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """估算视频、图片或工具箱任务的积分消耗。"""
    data = service.estimate(req)
    return ok(CreditEstimateResp(**data).model_dump(), request)


@router.post("/recharge-orders")
async def create_order(
    req: RechargeOrderReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """创建 Stripe 充值订单。"""
    order = await service.create_recharge_order(current_user["id"], req)
    return ok(RechargeOrderResp(**order).model_dump(mode="json"), request)


@router.post("/deduct")
async def deduct(
    req: CreditDeductReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """扣减积分，task_id 保证幂等。"""
    record = await service.deduct(current_user["id"], req)
    return ok({"record_id": str(record["id"]), "balance_after": record["balance_after"]}, request)


@router.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    service: CreditService = Depends(get_credit_service),
) -> dict:
    """Stripe Webhook 回调入口。"""
    raw_body = await request.body()
    signature = request.headers.get("stripe-signature")
    return ok(await service.handle_stripe_webhook(raw_body, signature), request)
