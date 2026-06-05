"""运行时配置校验测试。"""

import pytest

from app.config import Settings


def test_prod_rejects_default_jwt_secret() -> None:
    """生产环境不能沿用开发默认 JWT 密钥。"""
    settings = Settings(environment="prod", stripe_secret_key="sk_test")
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        settings.validate_production()


def test_prod_r2_requires_storage_credentials() -> None:
    """生产环境启用 R2 时必须提供对象存储凭据。"""
    settings = Settings(
        environment="prod",
        jwt_secret_key="prod-secret-value-with-more-than-32-chars",
        stripe_secret_key="sk_test",
        storage_backend="r2",
    )
    with pytest.raises(RuntimeError, match="R2_BUCKET_NAME"):
        settings.validate_production()


def test_prod_accepts_required_core_settings() -> None:
    """生产环境核心配置齐全时允许启动。"""
    settings = Settings(
        environment="prod",
        jwt_secret_key="prod-secret-value-with-more-than-32-chars",
        stripe_secret_key="sk_test",
        storage_backend="local",
    )
    settings.validate_production()
