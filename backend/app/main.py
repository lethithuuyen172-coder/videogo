"""FastAPI 应用入口，装配中间件、异常处理器和全部业务路由。"""

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.core.database import close_pool, create_pool
from app.core.exceptions import AppError
from app.core.responses import fail
from app.core.telemetry import REQUEST_COUNTER, REQUEST_LATENCY, create_metrics_app
from app.routers import (
    admin,
    auth,
    canvases,
    community,
    conversations,
    credits,
    health,
    images,
    materials,
    tools,
    videos,
)

logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    """创建应用实例，便于测试和生产入口复用。"""
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        """应用生命周期，负责数据库连接池创建和关闭。"""
        await create_pool()
        try:
            yield
        finally:
            await close_pool()

    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_context(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """为每个请求注入 request_id 并记录基础访问日志。"""
        request.state.request_id = f"req_{uuid4().hex}"
        started = perf_counter()
        response = await call_next(request)
        duration = perf_counter() - started
        response.headers["X-Request-ID"] = request.state.request_id
        REQUEST_COUNTER.labels(request.method, request.url.path, str(response.status_code)).inc()
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        logger.info(
            "request_completed",
            request_id=request.state.request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        """业务异常转换为统一错误响应。"""
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(exc.code, exc.message, request, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Pydantic 参数校验失败统一映射为 E001。"""
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=fail("E001", "请求参数错误", request, {"errors": exc.errors()}),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """兜底捕获未处理异常，避免内部细节泄露给前端。"""
        logger.exception("unhandled_error", request_id=getattr(request.state, "request_id", ""), error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=fail("E000", "未知系统错误", request),
        )

    app.mount("/storage", StaticFiles(directory=settings.local_storage_path, check_dir=False), name="storage")
    app.mount("/metrics", create_metrics_app())
    app.include_router(health.router)
    app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth")
    app.include_router(materials.router, prefix=f"{settings.api_prefix}/materials")
    app.include_router(videos.router, prefix=f"{settings.api_prefix}/videos")
    app.include_router(images.router, prefix=f"{settings.api_prefix}/images")
    app.include_router(canvases.router, prefix=f"{settings.api_prefix}/canvases")
    app.include_router(tools.router, prefix=f"{settings.api_prefix}/tools")
    app.include_router(community.router, prefix=f"{settings.api_prefix}/community")
    app.include_router(conversations.router, prefix=f"{settings.api_prefix}/conversations")
    app.include_router(credits.router, prefix=f"{settings.api_prefix}/credits")
    app.include_router(admin.router, prefix=f"{settings.api_prefix}/admin")
    return app


app = create_app()
