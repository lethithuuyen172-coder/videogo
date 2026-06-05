"""认证 API 路由：注册、登录、JWT 刷新和 API Key 管理。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request

from app.core.exceptions import AppError
from app.core.responses import ok
from app.core.security import verify_jwt
from app.models.auth import (
    APIKeyCreateReq,
    APIKeyResp,
    ChangePasswordReq,
    ForgotPasswordReq,
    RefreshTokenReq,
    ResetPasswordReq,
    UserInfoResp,
    UserLoginReq,
    UserRegisterReq,
    VerifyEmailReq,
)
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


def get_auth_service() -> AuthService:
    return AuthService()


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """解析 Bearer Token 或 X-API-Key 并加载当前用户。"""
    if authorization and authorization.startswith("Bearer "):
        payload = verify_jwt(authorization.removeprefix("Bearer ").strip())
        return await service.get_user(str(payload["sub"]))
    if x_api_key:
        return await service.get_user_by_api_key(x_api_key.strip())
    raise AppError("E002", "未认证或Token无效", 401)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """管理员权限依赖。"""
    if current_user["role"] != "admin":
        raise AppError("E003", "权限不足", 403)
    return current_user


def require_admin_or_moderator(current_user: dict = Depends(get_current_user)) -> dict:
    """管理后台审核权限依赖。"""
    if current_user["role"] not in {"admin", "moderator"}:
        raise AppError("E003", "权限不足", 403)
    return current_user


@router.post("/register")
async def register(req: UserRegisterReq, request: Request, service: AuthService = Depends(get_auth_service)) -> dict:
    """注册用户，开发环境直接置为 active 并发放初始积分。"""
    user = await service.register(req)
    data = UserInfoResp(**user).model_dump(mode="json")
    data["email_verification_token"] = service.issue_email_verification_token(user["id"])
    return ok(data, request)


@router.post("/login")
async def login(req: UserLoginReq, request: Request, service: AuthService = Depends(get_auth_service)) -> dict:
    """邮箱密码登录，密码错误5次锁定15分钟。"""
    tokens = await service.login(req)
    return ok(tokens.model_dump(), request)


@router.post("/refresh")
async def refresh(req: RefreshTokenReq, request: Request, service: AuthService = Depends(get_auth_service)) -> dict:
    """使用 refresh token 换取新 token。"""
    tokens = service.refresh(req.refresh_token)
    return ok(tokens.model_dump(), request)


@router.post("/logout")
async def logout(
    request: Request,
    authorization: str | None = Header(default=None),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """登出当前 access token。"""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("E002", "未认证或Token无效", 401)
    service.logout(authorization.removeprefix("Bearer ").strip())
    return ok({"revoked": True}, request)


@router.get("/me")
async def me(request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    """返回当前用户信息。"""
    return ok(UserInfoResp(**current_user).model_dump(mode="json"), request)


@router.post("/api-keys")
async def create_api_key(
    req: APIKeyCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """创建 API Key，明文仅本次响应返回。"""
    key = await service.create_api_key(current_user["id"], req)
    return ok(APIKeyResp(**key).model_dump(mode="json"), request)


@router.get("/api-keys")
async def list_api_keys(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """列出当前用户 API Key，永不返回明文。"""
    keys = await service.list_api_keys(current_user["id"])
    return ok([APIKeyResp(**key).model_dump(mode="json") for key in keys], request)


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """撤销 API Key，撤销后立即失效。"""
    await service.revoke_api_key(current_user["id"], key_id)
    return ok({"revoked": True}, request)


@router.post("/verify-email")
async def verify_email(
    req: VerifyEmailReq,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """验证邮箱 token 并更新用户状态。"""
    return ok(await service.verify_email(req), request)


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordReq,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """签发密码重置 token；生产环境可改为邮件发送。"""
    return ok(await service.forgot_password(req), request)


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordReq,
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """使用一次性 token 重置密码。"""
    return ok(await service.reset_password(req), request)


@router.post("/change-password")
async def change_password(
    req: ChangePasswordReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> dict:
    """登录态修改密码，需要旧密码校验。"""
    return ok(await service.change_password(current_user["id"], req), request)
