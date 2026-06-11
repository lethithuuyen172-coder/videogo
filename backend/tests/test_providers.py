"""Provider Router 和 Mock Provider 测试。"""

from pathlib import Path

import pytest

from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import ImageGenParams, VideoGenParams
from app.core.provider_router import provider_router
from app.providers.google_veo_video_provider import GoogleVeoVideoProvider
from app.providers.hfsy_image_provider import HFSYImageProvider
from app.providers.joyai_echo_video_provider import JoyAIEchoVideoProvider
from app.providers.nexaxis_video_provider import NexaxisVideoProvider


def test_provider_router_exposes_required_provider_keys() -> None:
    """V1.0 必须暴露 PRD 规定的视频和图片 provider key。"""
    models = provider_router.list_models()
    video_providers = {item.provider for item in models if item.modality == "video"}
    image_providers = {item.provider for item in models if item.modality == "image"}
    assert {"mock", "nexaxis", "google_gemini", "joyai_echo", "google_vertex", "seedance", "kling", "runway"} <= video_providers
    assert {"mock", "hfsy", "flux", "sdxl", "dalle", "ideogram"} <= image_providers


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


@pytest.mark.asyncio
async def test_hfsy_image_provider_calls_configured_endpoint(monkeypatch, tmp_path: Path) -> None:
    """HFSY Provider 必须按用户给出的 image-2 文档发起请求并返回图片 URL。"""
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("HFSY_IMAGE_API_KEYS", "sk-one,sk-two")
    monkeypatch.setenv("HFSY_IMAGE_BASE_URL", "https://www.hfsyapi.cn/v1/images/generations")
    calls: list[dict] = []

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"task_id": "img_1", "data": [{"file_id": "file_1", "url": "https://cdn.example/img.jpg"}]}

    class FakeClient:
        def __init__(self, timeout: float, **kwargs) -> None:
            assert timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            calls.append({"url": url, "headers": headers, "json": json})
            return FakeResponse()

    monkeypatch.setattr("app.providers.hfsy_image_provider.httpx.AsyncClient", FakeClient)
    result = await HFSYImageProvider().generate_image(
        "gpt-image-2pro",
        ImageGenParams(prompt="产品主图", resolution="2048", output_dir=tmp_path),
    )

    assert calls[0]["url"] == "https://www.hfsyapi.cn/v1/images/generations"
    assert calls[0]["headers"]["Authorization"] == "Bearer sk-one"
    assert calls[0]["json"]["model"] == "gpt-image-2pro"
    assert calls[0]["json"]["size"] == "2048x2048"
    assert calls[0]["json"]["response_format"] == "b64_json"
    assert result.provider == "hfsy"
    assert result.url == "https://cdn.example/img.jpg"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_joyai_echo_provider_runs_local_inference(monkeypatch, tmp_path: Path) -> None:
    """JoyAI-Echo Provider 必须生成 prompt/config，调用本地 inference.py，并复制最终视频。"""
    from app.config import get_settings

    repo_path = tmp_path / "JoyAI-Echo"
    repo_path.mkdir()
    (repo_path / "inference.py").write_text("print('ok')", encoding="utf-8")
    checkpoint = tmp_path / "echo-longvideo-release.safetensors"
    checkpoint.write_bytes(b"weights")
    gemma_path = tmp_path / "gemma-3-12b"
    gemma_path.mkdir()
    get_settings.cache_clear()
    monkeypatch.setenv("JOYAI_ECHO_REPO_PATH", str(repo_path))
    monkeypatch.setenv("JOYAI_ECHO_CHECKPOINT", str(checkpoint))
    monkeypatch.setenv("JOYAI_ECHO_GEMMA_PATH", str(gemma_path))
    monkeypatch.setenv("JOYAI_ECHO_PYTHON", "python")
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://localhost:8000")
    calls: list[dict] = []

    class FakeProcess:
        returncode = 0

        async def communicate(self):
            return b"done", b""

        def kill(self):
            return None

    async def fake_create_subprocess_exec(*command, cwd, stdout, stderr):
        output_root = Path(command[command.index("--output-root") + 1])
        combined = output_root / "outputs" / "prompt" / "inference_20260611" / "combined_shots.mp4"
        combined.parent.mkdir(parents=True, exist_ok=True)
        combined.write_bytes(b"mp4")
        calls.append({"command": command, "cwd": cwd, "stdout": stdout, "stderr": stderr})
        return FakeProcess()

    monkeypatch.setattr("app.providers.joyai_echo_video_provider.asyncio.create_subprocess_exec", fake_create_subprocess_exec)
    result = await JoyAIEchoVideoProvider().generate_video(
        "joyai-echo-longvideo",
        VideoGenParams(prompt="短视频分镜", duration_seconds=4, output_dir=tmp_path / "generated"),
    )

    assert calls[0]["command"][:2] == ("python", "inference.py")
    assert calls[0]["cwd"] == str(repo_path.resolve())
    assert result.provider == "joyai_echo"
    assert result.storage_key.startswith("generated/")
    assert (tmp_path / "generated" / result.storage_key.removeprefix("generated/")).read_bytes() == b"mp4"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_nexaxis_video_provider_creates_polls_and_downloads_video(monkeypatch, tmp_path: Path) -> None:
    """Nexaxis Provider 必须按官方 /v1/videos 任务流创建、轮询并下载视频。"""
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("NEXAXIS_API_KEY", "sk-video")
    monkeypatch.setenv("NEXAXIS_API_KEYS", "")
    monkeypatch.setenv("NEXAXIS_BASE_URL", "https://nexaxis.ai")
    monkeypatch.setenv("NEXAXIS_VIDEO_MODEL", "veo-compatible")
    calls: list[dict] = []

    class FakeResponse:
        def __init__(self, payload: dict, content: bytes = b"") -> None:
            self.status_code = 200
            self.payload = payload
            self.content = content
            self.text = str(payload)

        def json(self):
            return self.payload

    class FakeClient:
        def __init__(self, timeout: float, **kwargs) -> None:
            assert timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            calls.append({"url": url, "headers": headers, "json": json})
            return FakeResponse({"task_id": "task_1", "status": "pending"})

        async def get(self, url, headers):
            calls.append({"url": url, "headers": headers, "json": None})
            if url.endswith("/content"):
                return FakeResponse({}, b"mp4-bytes")
            return FakeResponse({"task_id": "task_1", "status": "completed"})

    monkeypatch.setattr("app.providers.nexaxis_video_provider.httpx.AsyncClient", FakeClient)
    result = await NexaxisVideoProvider().generate_video(
        "nexaxis-video",
        VideoGenParams(prompt="短视频", duration_seconds=15, output_dir=tmp_path),
    )

    assert calls[0]["url"] == "https://nexaxis.ai/v1/videos"
    assert calls[0]["headers"]["Authorization"] == "Bearer sk-video"
    assert calls[0]["json"]["model"] == "veo-compatible"
    assert calls[0]["json"]["prompt"] == "短视频"
    assert calls[0]["json"]["duration"] == 8
    assert calls[0]["json"]["size"] == "720x1280"
    assert result.provider == "nexaxis"
    assert result.storage_key == "generated/task_1.mp4"
    assert (tmp_path / "task_1.mp4").read_bytes() == b"mp4-bytes"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_google_veo_provider_runs_long_operation_and_downloads_video(monkeypatch, tmp_path: Path) -> None:
    """Google Veo Provider 必须创建长任务、轮询完成并下载视频文件。"""
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key")
    monkeypatch.setenv("GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    monkeypatch.setenv("GEMINI_VIDEO_MODEL", "veo-test")
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://localhost:8000")
    calls: list[tuple[str, str, dict | None]] = []

    class FakeResponse:
        def __init__(self, status_code: int, payload=None, content: bytes = b"") -> None:
            self.status_code = status_code
            self.payload = payload or {}
            self.content = content
            self.text = str(self.payload)

        def json(self):
            return self.payload

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            assert timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            calls.append(("post", url, json))
            assert headers["x-goog-api-key"] == "gemini-key"
            return FakeResponse(200, {"name": "operations/op-1"})

        async def get(self, url, headers):
            calls.append(("get", url, None))
            assert headers["x-goog-api-key"] == "gemini-key"
            if "operations/op-1" in url:
                return FakeResponse(
                    200,
                    {
                        "done": True,
                        "response": {
                            "generateVideoResponse": {
                                "generatedSamples": [{"video": {"uri": "https://video.example/file.mp4"}}]
                            }
                        },
                    },
                )
            return FakeResponse(200, content=b"mp4-bytes")

    monkeypatch.setattr("app.providers.google_veo_video_provider.httpx.AsyncClient", FakeClient)
    result = await GoogleVeoVideoProvider().generate_video(
        "google-veo-gemini",
        VideoGenParams(prompt="短视频", output_dir=tmp_path),
    )

    assert calls[0] == (
        "post",
        "https://generativelanguage.googleapis.com/v1beta/models/veo-test:predictLongRunning",
        {
            "instances": [{"prompt": "短视频"}],
            "parameters": {"aspectRatio": "9:16", "resolution": "720p"},
        },
    )
    assert result.provider == "google_gemini"
    assert result.url.startswith("http://localhost:8000/storage/generated/")
    assert (tmp_path / result.storage_key.removeprefix("generated/")).read_bytes() == b"mp4-bytes"
    get_settings.cache_clear()
