"""Redis 客户端单例，统一 key 前缀和连接配置。"""

from redis import Redis

from app.config import get_settings

_client: Redis | None = None


def get_redis() -> Redis:
    """返回同步 Redis 客户端，RQ、锁和黑名单共享该连接。"""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def app_key(name: str) -> str:
    """为业务 key 添加统一前缀，避免和 RQ 内部 key 冲突。"""
    return f"app:{name}"
