"""集中读取运行时配置，生产环境对关键密钥做强校验。"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，默认值仅服务本地开发和 Mock Provider。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI带货视频工厂"
    app_version: str = "2.0.0"
    environment: Literal["local", "dev", "staging", "prod"] = "local"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = "postgresql://postgres:postgres@localhost:5432/ugc_factory"
    redis_url: str = "redis://localhost:6379/0"
    storage_backend: Literal["local", "r2"] = "local"
    local_storage_path: str = "./storage"
    public_base_url: str = "http://localhost:8000"

    jwt_secret_key: str = "dev-only-change-me-please-32-bytes"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 7
    bcrypt_rounds: int = 12

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""

    openai_api_key: str = ""
    gemini_api_key: str = ""
    google_vertex_project: str = ""
    sdxl_api_key: str = ""
    flux_api_key: str = ""
    dalle_api_key: str = ""
    ideogram_api_key: str = ""

    free_daily_credit_limit: int = 5000
    default_new_user_credits: int = 100
    credit_unit_cny: float = 0.01
    request_timeout_seconds: float = 30.0

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        """生产环境需要通过环境变量提供足够长度的 JWT 密钥。"""
        if len(value) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return value

    def validate_production(self) -> None:
        """启动时检查生产环境必须存在的外部服务配置。"""
        if self.environment != "prod":
            return
        missing = [
            key
            for key, value in {
                "DATABASE_URL": self.database_url,
                "REDIS_URL": self.redis_url,
                "JWT_SECRET_KEY": self.jwt_secret_key,
                "STRIPE_SECRET_KEY": self.stripe_secret_key,
            }.items()
            if not value
        ]
        if self.jwt_secret_key == "dev-only-change-me-please-32-bytes":
            missing.append("JWT_SECRET_KEY(non-default)")
        if self.storage_backend == "r2":
            missing.extend(
                key
                for key, value in {
                    "R2_ENDPOINT_URL": self.r2_endpoint_url,
                    "R2_ACCESS_KEY_ID": self.r2_access_key_id,
                    "R2_SECRET_ACCESS_KEY": self.r2_secret_access_key,
                    "R2_BUCKET_NAME": self.r2_bucket_name,
                }.items()
                if not value
            )
        if missing:
            raise RuntimeError(f"Missing required production settings: {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    """返回缓存后的配置单例，避免每次请求重复解析环境变量。"""
    settings = Settings()
    settings.validate_production()
    return settings
