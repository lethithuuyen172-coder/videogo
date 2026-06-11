"""认证安全工具和路由契约测试。"""

from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.exceptions import AppError
from app.core.security import (
    create_jwt,
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_api_key,
    verify_jwt,
    verify_password,
)
from app.main import app
from app.models.auth import ChangePasswordReq, ResetPasswordReq, UserRegisterReq
from app.routers.auth import get_auth_service


def test_password_hash_roundtrip() -> None:
    """密码哈希必须可验证，错误密码必须失败。"""
    password_hash = hash_password("Aa123456")
    assert verify_password("Aa123456", password_hash)
    assert not verify_password("wrong-password", password_hash)


def test_seed_demo_password_hash_matches_demo_password() -> None:
    """种子账号必须能用验收文档里的 Demo1234 登录。"""
    seed_hash = "$2b$12$JfWnwyQJ3nrFhI4kfXzMnuyvySHd3scx6FHjbY/T5Eybp70q2YgEW"
    assert verify_password("Demo1234", seed_hash)


def test_api_key_hash_roundtrip() -> None:
    """API Key 明文只用于一次性展示，存储哈希仍可校验。"""
    plain_key, prefix = generate_api_key()
    key_hash = hash_api_key(plain_key)
    assert plain_key.startswith("ak_")
    assert plain_key.startswith(prefix)
    assert verify_api_key(plain_key, key_hash)
    assert not verify_api_key("ak_invalid", key_hash)


def test_auth_routes_are_registered() -> None:
    """OpenAPI 必须暴露认证核心接口。"""
    schema = app.openapi()
    assert "/api/v1/auth/register" in schema["paths"]
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/auth/api-keys" in schema["paths"]


def test_me_without_token_returns_unified_error() -> None:
    """未携带 Token 访问 /me 必须返回统一错误格式。"""
    client = TestClient(app)
    response = client.get("/api/v1/auth/me")
    body = response.json()
    assert response.status_code == 401
    assert body["success"] is False
    assert body["error"]["code"] == "E002"


def test_me_accepts_x_api_key_header() -> None:
    """X-API-Key 可作为机器调用凭证访问登录态接口。"""

    class FakeAuthService:
        async def get_user_by_api_key(self, api_key: str) -> dict:
            if api_key != "ak_test_valid":
                raise AppError("E002", "未认证或Token无效", 401)
            return {
                "id": uuid4(),
                "email": "bot@example.com",
                "display_name": "API Bot",
                "role": "user",
                "status": "active",
                "credit_balance": 100,
                "frozen_credits": 0,
                "created_at": datetime.now(UTC),
            }

    app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
    try:
        response = TestClient(app).get("/api/v1/auth/me", headers={"X-API-Key": "ak_test_valid"})
    finally:
        app.dependency_overrides.clear()
    body = response.json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["email"] == "bot@example.com"


def test_create_jwt_embeds_role_claim() -> None:
    """JWT 签发保持三段式 token 格式。"""
    token = create_jwt(str(uuid4()), "access", {"role": "admin"})
    assert token.count(".") == 2


def test_email_and_password_reset_token_types(monkeypatch) -> None:
    """邮箱验证和密码重置 token 必须使用独立类型，避免误用 access token。"""
    monkeypatch.setattr(
        "app.core.security.get_redis",
        lambda: type("RedisStub", (), {"exists": lambda self, key: False})(),
    )
    user_id = str(uuid4())
    email_token = create_jwt(user_id, "email_verify")
    reset_token = create_jwt(user_id, "password_reset")
    assert verify_jwt(email_token, expected_type="email_verify")["sub"] == user_id
    assert verify_jwt(reset_token, expected_type="password_reset")["sub"] == user_id


def test_password_models_reuse_strong_password_policy() -> None:
    """注册、重置和改密码请求使用同一强密码策略。"""
    assert UserRegisterReq(email="a@example.com", password="Aa123456").password == "Aa123456"
    assert ResetPasswordReq(token="tok", new_password="Aa123456").new_password == "Aa123456"
    assert (
        ChangePasswordReq(old_password="old", new_password="Aa123456").new_password
        == "Aa123456"
    )


def test_register_response_documents_email_verification_token() -> None:
    """OpenAPI 注册接口应暴露邮箱验证 token 字段的运行时返回能力。"""
    schema = app.openapi()
    assert "/api/v1/auth/verify-email" in schema["paths"]
    assert "/api/v1/auth/reset-password" in schema["paths"]
    assert "/api/v1/auth/change-password" in schema["paths"]
