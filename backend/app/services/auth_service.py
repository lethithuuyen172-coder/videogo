"""认证业务逻辑，封装用户、JWT 和 API Key 操作。"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import asyncpg

from app.config import get_settings
from app.core.database import get_pool, transaction
from app.core.exceptions import AppError
from app.core.security import (
    create_jwt,
    generate_api_key,
    hash_api_key,
    hash_password,
    revoke_jwt,
    verify_api_key,
    verify_jwt,
    verify_password,
)
from app.models.auth import (
    APIKeyCreateReq,
    ChangePasswordReq,
    ForgotPasswordReq,
    ResetPasswordReq,
    TokenResp,
    UserLoginReq,
    UserRegisterReq,
    VerifyEmailReq,
)


class AuthService:
    """认证服务，供路由和依赖注入复用。"""

    async def register(self, req: UserRegisterReq) -> dict:
        settings = get_settings()
        async with transaction() as conn:
            try:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.users (email, password_hash, display_name, status, credit_balance)
                    VALUES ($1, $2, $3, 'active', $4)
                    RETURNING *
                    """,
                    req.email.lower(),
                    hash_password(req.password),
                    req.display_name,
                    settings.default_new_user_credits,
                )
            except asyncpg.UniqueViolationError as exc:
                raise AppError("E005", "邮箱已注册", 409) from exc
        return dict(row)

    async def login(self, req: UserLoginReq) -> TokenResp:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM public.users WHERE email=$1 AND deleted_at IS NULL", req.email.lower())
            if row is None:
                raise AppError("E002", "邮箱或密码错误", 401)
            if row["locked_until"] and row["locked_until"] > datetime.now(UTC):
                raise AppError("E003", "密码错误次数过多，请15分钟后再试", 403)
            if not verify_password(req.password, row["password_hash"]):
                failed = int(row["failed_login_count"]) + 1
                locked_until = datetime.now(UTC) + timedelta(minutes=15) if failed >= 5 else None
                await conn.execute(
                    "UPDATE public.users SET failed_login_count=$1, locked_until=$2 WHERE id=$3",
                    failed,
                    locked_until,
                    row["id"],
                )
                raise AppError("E002", "邮箱或密码错误", 401)
            await conn.execute(
                "UPDATE public.users SET failed_login_count=0, locked_until=NULL, last_login_at=now() WHERE id=$1",
                row["id"],
            )
        return self._tokens(str(row["id"]), row["role"])

    def refresh(self, refresh_token: str) -> TokenResp:
        payload = verify_jwt(refresh_token, expected_type="refresh")
        return self._tokens(str(payload["sub"]), str(payload.get("role", "user")))

    def logout(self, access_token: str) -> None:
        revoke_jwt(access_token)

    def issue_email_verification_token(self, user_id: UUID) -> str:
        """签发邮箱验证 token；生产环境应通过邮件发送。"""
        return create_jwt(str(user_id), "email_verify")

    async def verify_email(self, req: VerifyEmailReq) -> dict:
        """消费邮箱验证 token 并激活邮箱状态。"""
        payload = verify_jwt(req.token, expected_type="email_verify")
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE public.users
                SET email_verified_at=now(), status='active'
                WHERE id=$1 AND deleted_at IS NULL
                RETURNING id, email, email_verified_at, status
                """,
                UUID(str(payload["sub"])),
            )
        if row is None:
            raise AppError("E004", "用户不存在", 404)
        return dict(row)

    async def forgot_password(self, req: ForgotPasswordReq) -> dict:
        """签发密码重置 token；不存在的邮箱也返回 accepted，避免账号探测。"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM public.users WHERE email=$1 AND deleted_at IS NULL",
                req.email.lower(),
            )
        if row is None:
            return {"status": "accepted", "expires_in_hours": 24, "reset_token": None}  # nosec B105
        token = create_jwt(str(row["id"]), "password_reset")
        return {"status": "accepted", "expires_in_hours": 24, "reset_token": token}

    async def reset_password(self, req: ResetPasswordReq) -> dict:
        """使用密码重置 token 更新密码。"""
        payload = verify_jwt(req.token, expected_type="password_reset")
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE public.users
                SET password_hash=$2, failed_login_count=0, locked_until=NULL
                WHERE id=$1 AND deleted_at IS NULL
                RETURNING id
                """,
                UUID(str(payload["sub"])),
                hash_password(req.new_password),
            )
        if row is None:
            raise AppError("E004", "用户不存在", 404)
        return {"status": "updated"}

    async def change_password(self, user_id: UUID, req: ChangePasswordReq) -> dict:
        """登录态修改密码，必须校验旧密码。"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT password_hash FROM public.users WHERE id=$1 AND deleted_at IS NULL",
                user_id,
            )
            if row is None:
                raise AppError("E004", "用户不存在", 404)
            if not verify_password(req.old_password, row["password_hash"]):
                raise AppError("E002", "旧密码错误", 401)
            await conn.execute(
                "UPDATE public.users SET password_hash=$2 WHERE id=$1",
                user_id,
                hash_password(req.new_password),
            )
        return {"status": "updated"}

    async def get_user(self, user_id: str) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM public.users WHERE id=$1 AND deleted_at IS NULL", UUID(user_id))
        if row is None:
            raise AppError("E002", "未认证或Token无效", 401)
        return dict(row)

    async def get_user_by_api_key(self, api_key: str) -> dict:
        """按请求 API Key 反查用户，并记录最近使用时间。"""
        prefix = api_key[:12]
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    k.id AS api_key_id,
                    k.key_hash,
                    u.id,
                    u.email,
                    u.display_name,
                    u.role,
                    u.status,
                    u.credit_balance,
                    u.frozen_credits,
                    u.created_at
                FROM public.api_keys k
                JOIN public.users u ON u.id = k.user_id
                WHERE k.key_prefix=$1
                  AND k.revoked_at IS NULL
                  AND k.deleted_at IS NULL
                  AND u.deleted_at IS NULL
                ORDER BY k.created_at DESC
                """,
                prefix,
            )
            for row in rows:
                if verify_api_key(api_key, row["key_hash"]):
                    await conn.execute("UPDATE public.api_keys SET last_used_at=now() WHERE id=$1", row["api_key_id"])
                    data = dict(row)
                    data.pop("api_key_id", None)
                    data.pop("key_hash", None)
                    return data
        raise AppError("E002", "未认证或Token无效", 401)

    async def create_api_key(self, user_id: UUID, req: APIKeyCreateReq) -> dict:
        plain_key, prefix = generate_api_key()
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO public.api_keys (user_id, name, key_prefix, key_hash)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, key_prefix, revoked_at, created_at
                """,
                user_id,
                req.name,
                prefix,
                hash_api_key(plain_key),
            )
        data = dict(row)
        data["plain_key"] = plain_key
        return data

    async def list_api_keys(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, name, key_prefix, revoked_at, created_at
                FROM public.api_keys
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                user_id,
            )
        return [dict(row) for row in rows]

    async def revoke_api_key(self, user_id: UUID, key_id: UUID) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE public.api_keys SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL",
                key_id,
                user_id,
            )
        if result.endswith("0"):
            raise AppError("E004", "API Key不存在", 404)

    @staticmethod
    def _tokens(user_id: str, role: str) -> TokenResp:
        settings = get_settings()
        return TokenResp(
            access_token=create_jwt(user_id, "access", {"role": role}),
            refresh_token=create_jwt(user_id, "refresh", {"role": role}),
            expires_in=settings.access_token_minutes * 60,
        )
