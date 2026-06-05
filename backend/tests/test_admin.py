"""管理后台权限边界测试。"""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.routers.admin import get_admin_service
from app.routers.auth import get_current_user


def _user(role: str) -> dict:
    return {
        "id": uuid4(),
        "email": f"{role}@example.com",
        "display_name": role,
        "role": role,
        "status": "active",
        "credit_balance": 100,
        "frozen_credits": 0,
    }


class FakeAdminService:
    async def moderation_queue(self) -> list[dict]:
        return []


def test_admin_dashboard_rejects_normal_user() -> None:
    """非管理员访问管理后台统计必须返回403。"""
    app.dependency_overrides[get_current_user] = lambda: _user("user")
    try:
        response = TestClient(app).get("/api/v1/admin/dashboard")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "E003"


def test_moderator_can_read_moderation_queue() -> None:
    """内容审核员可以访问审核队列。"""
    app.dependency_overrides[get_current_user] = lambda: _user("moderator")
    app.dependency_overrides[get_admin_service] = lambda: FakeAdminService()
    try:
        response = TestClient(app).get("/api/v1/admin/moderation/works")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_moderator_cannot_adjust_credits() -> None:
    """内容审核员不能访问积分调整接口。"""
    app.dependency_overrides[get_current_user] = lambda: _user("moderator")
    try:
        response = TestClient(app).post(
            "/api/v1/admin/credits/adjust",
            json={"user_id": str(uuid4()), "amount": 10, "description": "test"},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "E003"
