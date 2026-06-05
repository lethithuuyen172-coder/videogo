"""积分预估和错误码契约测试。"""

import json

from fastapi.testclient import TestClient

from app.core.exceptions import AppError
from app.main import app
from app.models.credits import CreditEstimateReq
from app.services.credit_service import CreditService


def test_video_credit_estimate_uses_provider_router() -> None:
    """视频积分预估必须使用 Provider Router 成本规则。"""
    data = CreditService().estimate(
        CreditEstimateReq(task_type="video", model_id="mock-video", duration_seconds=15)
    )
    assert data["estimated_credits"] == 15
    assert data["task_type"] == "video"


def test_image_credit_estimate_uses_resolution() -> None:
    """图片积分预估随分辨率变化。"""
    data = CreditService().estimate(
        CreditEstimateReq(task_type="image", model_id="mock-image", resolution="2048")
    )
    assert data["estimated_credits"] == 10


def test_credit_estimate_api_accepts_public_request() -> None:
    """积分预估 API 不依赖登录，便于前端生成前展示成本。"""
    client = TestClient(app)
    response = client.post(
        "/api/v1/credits/estimate",
        json={"task_type": "image", "model_id": "mock-image", "resolution": "1024"},
    )
    body = response.json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["estimated_credits"] == 5


def test_deduct_without_token_is_rejected() -> None:
    """扣减积分必须认证。"""
    client = TestClient(app)
    response = client.post(
        "/api/v1/credits/deduct",
        json={"task_id": "task_test", "amount": 1},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "E002"


def test_stripe_webhook_rejects_invalid_signature(monkeypatch) -> None:
    """配置 webhook secret 后，错误签名必须拒绝。"""
    service = CreditService()
    settings = type("Settings", (), {"stripe_webhook_secret": "whsec_test"})()
    monkeypatch.setattr("app.services.credit_service.get_settings", lambda: settings)

    try:
        service._parse_stripe_event(b'{"type":"ping"}', "t=1,v1=bad")
    except AppError as exc:
        assert exc.code == "E003"
    else:
        raise AssertionError("invalid signature should be rejected")


def test_stripe_webhook_allows_local_mock_without_secret(monkeypatch) -> None:
    """本地未配置 secret 时允许解析 mock 事件，便于开发联调。"""
    service = CreditService()
    settings = type("Settings", (), {"stripe_webhook_secret": ""})()
    monkeypatch.setattr("app.services.credit_service.get_settings", lambda: settings)

    event = service._parse_stripe_event(json.dumps({"id": "evt_1", "type": "ping"}).encode(), None)

    assert event["type"] == "ping"


async def test_stripe_webhook_ignores_unhandled_event(monkeypatch) -> None:
    """非 checkout 完成事件应确认接收但不处理到账。"""
    service = CreditService()
    settings = type("Settings", (), {"stripe_webhook_secret": ""})()
    monkeypatch.setattr("app.services.credit_service.get_settings", lambda: settings)

    result = await service.handle_stripe_webhook(
        json.dumps({"id": "evt_1", "type": "customer.created"}).encode(),
        None,
    )

    assert result == {"received": True, "event_type": "customer.created", "processed": False}
