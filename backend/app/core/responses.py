"""API 统一响应格式，确保所有路由符合 PRD 的 success/error 契约。"""

from math import ceil
from typing import Any
from uuid import uuid4

from fastapi import Request
from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    """标准错误对象。"""

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class Pagination(BaseModel):
    """列表接口分页信息。"""

    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def from_total(cls, total: int, page: int, page_size: int) -> "Pagination":
        return cls(total=total, page=page, page_size=page_size, total_pages=ceil(total / page_size))


class ApiResponse(BaseModel):
    """成功和失败共用的顶层响应模型。"""

    success: bool
    data: Any | None = None
    pagination: Pagination | None = None
    error: ErrorBody | None = None
    request_id: str


def get_request_id(request: Request | None = None) -> str:
    """优先复用中间件设置的 request_id，缺失时生成新值。"""
    if request is not None and hasattr(request.state, "request_id"):
        return str(request.state.request_id)
    return f"req_{uuid4().hex}"


def ok(
    data: Any | None = None,
    request: Request | None = None,
    pagination: Pagination | None = None,
) -> dict[str, Any]:
    """构造成功响应字典，FastAPI 会继续处理 JSON 序列化。"""
    return ApiResponse(
        success=True,
        data=data,
        pagination=pagination,
        request_id=get_request_id(request),
    ).model_dump(mode="json", exclude_none=True)


def fail(
    code: str,
    message: str,
    request: Request | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """构造失败响应字典，供异常处理器复用。"""
    return ApiResponse(
        success=False,
        error=ErrorBody(code=code, message=message, details=details or {}),
        request_id=get_request_id(request),
    ).model_dump(mode="json", exclude_none=True)
