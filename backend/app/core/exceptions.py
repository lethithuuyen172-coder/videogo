"""统一业务异常，供全局异常处理器转换为标准 API 响应。"""

from typing import Any


class AppError(Exception):
    """携带错误码、HTTP 状态和明细的业务异常。"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ProviderError(AppError):
    """Provider 调用失败或功能未实现时使用的异常。"""

    def __init__(self, code: str, message: str, status_code: int = 503) -> None:
        super().__init__(code=code, message=message, status_code=status_code)
