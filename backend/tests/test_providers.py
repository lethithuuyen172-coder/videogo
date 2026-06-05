"""Provider Router 和 Mock Provider 测试。"""

from pathlib import Path

import pytest

from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import ImageGenParams, VideoGenParams
from app.core.provider_router import provider_router


def test_provider_router_exposes_required_provider_keys() -> None:
    """V1.0 必须暴露 PRD 规定的视频和图片 provider key。"""
    models = provider_router.list_models()
    video_providers = {item.provider for item in models if item.modality == "video"}
    image_providers = {item.provider for item in models if item.modality == "image"}
    assert {"mock", "google_gemini", "google_vertex", "seedance", "kling", "runway"} <= video_providers
    assert {"mock", "flux", "sdxl", "dalle", "ideogram"} <= image_providers


@pytest.mark.asyncio
async def test_mock_image_provider_generates_file(tmp_path: Path) -> None:
    """Mock 图片 Provider 必须端到端生成本地图片文件。"""
    result = await provider_router.generate_image(
        "mock-image",
        ImageGenParams(prompt="产品主图", output_dir=tmp_path),
    )
    assert result.provider == "mock"
    assert result.storage_key.startswith("generated/")
    assert list(tmp_path.glob("*.png"))


@pytest.mark.asyncio
async def test_unknown_image_model_returns_e001() -> None:
    """未知模型必须返回参数错误，而不是内部异常。"""
    with pytest.raises(AppError) as exc_info:
        await provider_router.generate_image(
            "missing-model",
            ImageGenParams(prompt="产品主图"),
        )
    assert exc_info.value.code == "E001"


@pytest.mark.asyncio
async def test_coming_soon_video_provider_returns_e201() -> None:
    """V1.0 stub provider 必须明确返回 E201。"""
    with pytest.raises(ProviderError) as exc_info:
        await provider_router.generate_video(
            "seedance-video",
            VideoGenParams(prompt="短视频"),
        )
    assert exc_info.value.code == "E201"
