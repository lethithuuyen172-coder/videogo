"""密码、JWT 和 API Key 安全工具。"""

from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from typing import Any
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.core.exceptions import AppError
from app.core.redis_client import app_key, get_redis

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(password: str) -> str:
    """使用 bcrypt 哈希密码，明文永不持久化。"""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """校验用户输入密码是否匹配存储哈希。"""
    return pwd_context.verify(password, password_hash)


def create_jwt(subject: str, token_type: str = "access", extra: dict[str, Any] | None = None) -> str:
    """签发 access/refresh token，并写入 jti 以支持撤销。"""
    settings = get_settings()
    now = datetime.now(UTC)
    ttl = (
        timedelta(minutes=settings.access_token_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_days)
    )
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "jti": uuid4().hex,
        **(extra or {}),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_jwt(token: str, expected_type: str = "access") -> dict[str, Any]:
    """验证 JWT 签名、过期时间、类型和撤销状态。"""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise AppError("E002", "未认证或Token无效", 401) from exc
    if payload.get("type") != expected_type:
        raise AppError("E002", "Token类型不匹配", 401)
    jti = str(payload.get("jti", ""))
    if jti and get_redis().exists(app_key(f"jwt:revoked:{jti}")):
        raise AppError("E002", "Token已失效", 401)
    return payload


def revoke_jwt(token: str) -> None:
    """将 JWT 加入 Redis 黑名单，TTL 与 refresh token 保持一致。"""
    payload = verify_jwt(token, expected_type=str(jwt.decode(token, options={"verify_signature": False}).get("type")))
    jti = str(payload["jti"])
    exp = int(payload["exp"])
    ttl = max(exp - int(datetime.now(UTC).timestamp()), 1)
    get_redis().setex(app_key(f"jwt:revoked:{jti}"), ttl, "1")


def generate_api_key() -> tuple[str, str]:
    """生成 API Key 明文和展示前缀，明文仅创建时返回。"""
    raw = f"ak_{token_urlsafe(32)}"
    return raw, raw[:12]


def hash_api_key(api_key: str) -> str:
    """API Key 使用 bcrypt 哈希，数据库不保存明文。"""
    return pwd_context.hash(api_key)


def verify_api_key(api_key: str, api_key_hash: str) -> bool:
    """校验请求中的 API Key。"""
    return pwd_context.verify(api_key, api_key_hash)
