"""健康检查端点，覆盖 API、数据库、Redis 和队列基础状态。"""

from typing import Any

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.database import get_pool
from app.core.redis_client import get_redis
from app.core.responses import ok

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> JSONResponse:
    """检查核心依赖可用性，依赖异常时返回 503。"""
    settings = get_settings()
    checks: dict[str, Any] = {"database": "skipped", "redis": "skipped", "queue_depth": 0}
    http_status = status.HTTP_200_OK

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        checks["database"] = "ok"
    except Exception as exc:  # pragma: no cover - depends on local infra
        checks["database"] = f"error: {exc.__class__.__name__}"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    try:
        redis = get_redis()
        redis.ping()
        checks["redis"] = "ok"
        checks["queue_depth"] = redis.llen("rq:queue:default")
    except Exception as exc:  # pragma: no cover - depends on local infra
        checks["redis"] = f"error: {exc.__class__.__name__}"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status,
        content=ok(
            {
                "status": "healthy" if http_status == status.HTTP_200_OK else "degraded",
                "version": settings.app_version,
                "checks": checks,
            },
            request,
        ),
    )
