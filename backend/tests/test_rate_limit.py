"""Rate limit middleware behavior."""

from fastapi.testclient import TestClient
from redis.exceptions import RedisError

from app.config import get_settings
from app.main import create_app
from app.models.auth import TokenResp
from app.routers.auth import get_auth_service


class RedisCounterStub:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}

    def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    def expire(self, key: str, seconds: int) -> bool:
        return True


class RedisFailStub:
    def incr(self, key: str) -> int:
        raise RedisError("redis down")


def make_client(monkeypatch, redis_stub, enabled: bool = True, limit: int = 2) -> TestClient:
    get_settings.cache_clear()
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true" if enabled else "false")
    monkeypatch.setenv("RATE_LIMIT_LOGIN_PER_MINUTE", str(limit))
    monkeypatch.setenv("SKIP_DB_STARTUP", "true")
    monkeypatch.setattr("app.core.rate_limit.get_redis", lambda: redis_stub)
    class FakeAuthService:
        async def login(self, req) -> TokenResp:
            return TokenResp(
                access_token="access.test.token",
                refresh_token="refresh.test.token",
                expires_in=3600,
            )

    try:
        app = create_app()
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        return TestClient(app)
    finally:
        get_settings.cache_clear()


def test_rate_limit_allows_requests_under_limit(monkeypatch) -> None:
    client = make_client(monkeypatch, RedisCounterStub(), enabled=True, limit=2)
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Aa123456"})
    assert response.status_code == 200


def test_rate_limit_returns_429_when_limit_exceeded(monkeypatch) -> None:
    client = make_client(monkeypatch, RedisCounterStub(), enabled=True, limit=1)
    client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Aa123456"})
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Aa123456"})
    body = response.json()
    assert response.status_code == 429
    assert body["success"] is False
    assert body["error"]["code"] == "E429"


def test_rate_limit_can_be_disabled(monkeypatch) -> None:
    client = make_client(monkeypatch, RedisCounterStub(), enabled=False, limit=0)
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Aa123456"})
    assert response.status_code == 200


def test_rate_limit_fails_open_when_redis_is_unavailable(monkeypatch) -> None:
    client = make_client(monkeypatch, RedisFailStub(), enabled=True, limit=0)
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Aa123456"})
    assert response.status_code == 200
