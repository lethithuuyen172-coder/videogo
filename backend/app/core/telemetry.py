"""Prometheus 指标端点和 OpenTelemetry 初始化入口。"""

from prometheus_client import Counter, Histogram, make_asgi_app

REQUEST_COUNTER = Counter(
    "ugc_factory_http_requests_total",
    "Total HTTP requests handled by API",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "ugc_factory_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
)


def create_metrics_app():
    """返回 Prometheus ASGI 应用，main.py 挂载到 /metrics。"""
    return make_asgi_app()
