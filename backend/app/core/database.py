"""asyncpg 连接池管理，所有数据库访问都从这里获取连接。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.config import get_settings

_pool: asyncpg.Pool | None = None


async def create_pool() -> asyncpg.Pool:
    """创建全局连接池，重复调用会复用已有池。"""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=1,
            max_size=10,
            command_timeout=30,
        )
    return _pool


async def get_pool() -> asyncpg.Pool:
    """返回连接池；未初始化时自动创建。"""
    if _pool is None:
        return await create_pool()
    return _pool


async def close_pool() -> None:
    """关闭连接池，主要用于应用退出和测试清理。"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def transaction() -> AsyncIterator[asyncpg.Connection]:
    """事务上下文，服务层需要原子写入时使用。"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
