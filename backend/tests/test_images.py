"""AI 图片模块契约测试。"""

import base64

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import get_settings
from app.core.provider_base import ImageGenParams
from app.main import app
from app.models.generation import ImageCreateReq
from app.providers.openai_image_provider import OpenAIImageProvider
from app.services.generation_service import GenerationService


def test_image_routes_cover_models_styles_and_queue() -> None:
    """图片模块必须暴露模型、风格、任务和队列入口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/images/models" in paths
    assert "/api/v1/images/styles" in paths
    assert "/api/v1/images" in paths
    assert "/api/v1/images/{job_id}/enqueue" in paths
    assert "/api/v1/images/{job_id}/run-now" in paths


def test_image_models_treat_browser_openai_key_as_configured(monkeypatch) -> None:
    """浏览器填写 Key 后，DALL-E 模型列表必须显示已配置。"""
    get_settings.cache_clear()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-your-key-here")
    try:
        response = TestClient(app).get(
            "/api/v1/images/models",
            headers={"X-OpenAI-API-Key": "sk-browser"},
        )
    finally:
        get_settings.cache_clear()

    body = response.json()
    dalle = next(item for item in body["data"] if item["model_id"] == "dalle-3")
    assert dalle["status"] == "configured"


def test_image_request_limits_match_prd() -> None:
    """图片比例、分辨率和格式必须被模型约束。"""
    assert ImageCreateReq(prompt="demo", aspect_ratio="4:5", resolution="4096").resolution == "4096"
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", aspect_ratio="3:2")
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", resolution="8192")
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", image_format="gif")


def test_image_style_key_is_accepted_and_applied_to_prompt() -> None:
    """风格预设必须能进入后端提示词，而不是只停留在前端。"""
    req = ImageCreateReq(prompt="demo", style_key="commerce")
    assert req.style_key == "commerce"
    assert GenerationService._apply_image_style(req.prompt, req.style_key) == "demo, clean product lighting"


@pytest.mark.asyncio
async def test_openai_image_provider_calls_api_and_writes_output(monkeypatch, tmp_path) -> None:
    """OpenAI 图片 Provider 必须按 DALL-E 参数调用 API，并把 b64 结果落盘。"""
    get_settings.cache_clear()
    monkeypatch.setenv("DALLE_API_KEY", "sk-test")
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://localhost:8000")
    calls: list[dict] = []

    class FakeImages:
        async def generate(self, **kwargs):
            calls.append(kwargs)
            data = [type("ImageData", (), {"b64_json": base64.b64encode(b"image-bytes").decode("ascii")})()]
            return type("ImageResponse", (), {"data": data})()

    class FakeClient:
        def __init__(self, api_key: str) -> None:
            assert api_key == "sk-test"
            self.images = FakeImages()

    monkeypatch.setattr("app.providers.openai_image_provider.AsyncOpenAI", FakeClient)
    result = await OpenAIImageProvider().generate_image(
        "dalle-3",
        ImageGenParams(prompt="product hero", aspect_ratio="16:9", output_dir=tmp_path),
    )

    assert calls == [
        {
            "model": "dalle-3",
            "prompt": "product hero",
            "size": "1792x1024",
            "n": 1,
            "response_format": "b64_json",
        }
    ]
    assert result.provider == "openai"
    assert result.url.startswith("http://localhost:8000/storage/generated/")
    assert (tmp_path / result.storage_key.removeprefix("generated/")).read_bytes() == b"image-bytes"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_openai_image_provider_uses_browser_key_override(monkeypatch, tmp_path) -> None:
    """浏览器填写的 OpenAI Key 必须能覆盖占位环境变量生成图片。"""
    get_settings.cache_clear()
    monkeypatch.setenv("DALLE_API_KEY", "sk-your-key-here")
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://localhost:8000")
    captured_keys: list[str] = []

    class FakeImages:
        async def generate(self, **kwargs):
            data = [type("ImageData", (), {"b64_json": base64.b64encode(b"image-bytes").decode("ascii")})()]
            return type("ImageResponse", (), {"data": data})()

    class FakeClient:
        def __init__(self, api_key: str) -> None:
            captured_keys.append(api_key)
            self.images = FakeImages()

    monkeypatch.setattr("app.providers.openai_image_provider.AsyncOpenAI", FakeClient)
    result = await OpenAIImageProvider().generate_image(
        "dalle-3",
        ImageGenParams(prompt="product hero", output_dir=tmp_path, openai_api_key="sk-browser"),
    )

    assert captured_keys == ["sk-browser"]
    assert result.url.startswith("http://localhost:8000/storage/generated/")
    get_settings.cache_clear()
