"""Redis-backed request rate limiting with fail-open behavior."""

from dataclasses import dataclass

import structlog
from fastapi import Request
from redis.exceptions import RedisError

from app.config import Settings
from app.core.redis_client import app_key, get_redis

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class RateLimitRule:
    """Simple fixed-window rate limit rule."""

    name: str
    limit: int
    window_seconds: int = 60


def get_rate_limit_rule(request: Request, settings: Settings) -> RateLimitRule | None:
    """Return the applicable rate limit rule for the request path."""
    if not settings.rate_limit_enabled:
        return None
    path = request.url.path
    if path.endswith("/auth/login") or path.endswith("/auth/register"):
        return RateLimitRule("auth", settings.rate_limit_login_per_minute)
    if "/videos" in path or "/images" in path or "/tools" in path:
        if request.method in {"POST", "PUT", "PATCH"}:
            return RateLimitRule("generation", settings.rate_limit_generation_per_minute)
    return None


def get_rate_limit_identity(request: Request, rule: RateLimitRule) -> str:
    """Use authenticated principal when present, otherwise client IP."""
    authorization = request.headers.get("authorization", "")
    if rule.name == "generation" and authorization.startswith("Bearer "):
        return f"token:{authorization.removeprefix('Bearer ').strip()[:24]}"
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"
    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def is_rate_limited(request: Request, settings: Settings) -> tuple[bool, RateLimitRule | None]:
    """Increment the current request counter and report whether it exceeds the rule."""
    rule = get_rate_limit_rule(request, settings)
    if rule is None:
        return False, None
    key = app_key(f"rate_limit:{rule.name}:{get_rate_limit_identity(request, rule)}")
    try:
        redis = get_redis()
        count = int(redis.incr(key))
        if count == 1:
            redis.expire(key, rule.window_seconds)
        return count > rule.limit, rule
    except RedisError as exc:
        logger.warning("rate_limit_fail_open", rule=rule.name, error=str(exc))
        return False, rule
