"""管理后台 API，覆盖统计、审核、积分调整和审计日志。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.responses import ok
from app.models.admin import AdjustCreditsReq, DashboardStats, ModerateWorkReq
from app.routers.auth import require_admin, require_admin_or_moderator
from app.services.admin_service import AdminService

router = APIRouter(tags=["admin"])


def get_admin_service() -> AdminService:
    return AdminService()


@router.get("/dashboard")
async def dashboard(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """聚合核心后台统计数据。"""
    _ = current_user
    data = await service.dashboard_stats()
    return ok(DashboardStats(**data).model_dump(), request)


@router.get("/users")
async def list_users(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询用户列表。"""
    _ = current_user
    return ok(await service.list_users(), request)


@router.get("/moderation/works")
async def moderation_queue(
    request: Request,
    current_user: dict = Depends(require_admin_or_moderator),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询待审核作品队列。"""
    _ = current_user
    return ok(await service.moderation_queue(), request)


@router.post("/moderation/works/{work_id}")
async def moderate_work(
    work_id: UUID,
    req: ModerateWorkReq,
    request: Request,
    current_user: dict = Depends(require_admin_or_moderator),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """审核或下架社区作品，并写审计日志。"""
    return ok(await service.moderate_work(current_user["id"], work_id, req), request)


@router.post("/credits/adjust")
async def adjust_credits(
    req: AdjustCreditsReq,
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """管理员手动调整积分，必须写入审计日志。"""
    return ok(await service.adjust_credits(current_user["id"], req), request)


@router.get("/audit-logs")
async def audit_logs(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询审计日志。"""
    _ = current_user
    return ok(await service.audit_logs(), request)


@router.get("/provider-accounts")
async def provider_accounts(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询 Provider 账号池。"""
    _ = current_user
    return ok(await service.provider_accounts(), request)


@router.put("/provider-accounts/{account_id}")
async def update_provider_account(
    account_id: UUID,
    payload: dict,
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """更新 Provider 账号状态和优先级。"""
    _ = current_user
    return ok(await service.update_provider_account(account_id, payload), request)


@router.get("/recharge-orders")
async def recharge_orders(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询充值订单。"""
    _ = current_user
    return ok(await service.recharge_orders(), request)


@router.get("/system-settings")
async def system_settings(
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询系统配置摘要，敏感密钥不返回。"""
    _ = current_user
    return ok(service.system_settings(), request)


@router.put("/system-settings")
async def update_system_settings(
    payload: dict,
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """更新系统配置骨架。"""
    _ = current_user
    return ok(service.update_system_settings(payload), request)


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """查询用户详情。"""
    _ = current_user
    return ok(await service.get_user_detail(user_id), request)


@router.put("/users/{user_id}")
async def update_user(
    user_id: UUID,
    payload: dict,
    request: Request,
    current_user: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """更新用户角色和状态。"""
    _ = current_user
    return ok(await service.update_user(user_id, payload), request)


@router.get("/content-reports")
async def content_reports(
    request: Request,
    current_user: dict = Depends(require_admin_or_moderator),
    service: AdminService = Depends(get_admin_service),
) -> dict:
    """内容举报队列骨架。"""
    _ = current_user
    return ok(service.content_reports(), request)
