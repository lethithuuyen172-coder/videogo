"""Google Gemini Veo video provider."""

import asyncio
from uuid import uuid4

import httpx

from app.config import get_settings
from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import BaseVideoProvider, ProviderModel, ProviderResult, VideoGenParams


class GoogleVeoVideoProvider(BaseVideoProvider):
    """Generate videos through the official Gemini Veo long-running API."""

    provider_key = "google_gemini"
    model_id = "google-veo-gemini"

    def get_model_list(self) -> list[ProviderModel]:
        settings = get_settings()
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=f"Google Veo ({settings.gemini_video_model})",
                modality="video",
                status="configured" if settings.gemini_api_key else "coming_soon",
                credit_cost=180,
            )
        ]

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise AppError("E101", "请先配置 GEMINI_API_KEY 才能使用 Google Veo", 400)

        operation = await self._start_operation(params)
        operation_name = operation.get("name")
        if not operation_name:
            raise ProviderError("E200", "Google Veo 未返回 operation name")

        completed = await self._poll_operation(str(operation_name))
        video_uri = self._extract_video_uri(completed)
        if not video_uri:
            raise ProviderError("E202", f"Google Veo 任务完成但没有返回视频 URI: {operation_name}", 502)

        params.output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.mp4"
        output_path = params.output_dir / filename
        await self._download_video(video_uri, output_path)
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={
                "operation": operation_name,
                "duration": params.duration_seconds,
                "aspect_ratio": params.aspect_ratio,
                "resolution": params.resolution,
            },
        )

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(180, duration_seconds * 12)

    async def _start_operation(self, params: VideoGenParams) -> dict:
        settings = get_settings()
        endpoint = f"{settings.gemini_api_base_url.rstrip('/')}/models/{settings.gemini_video_model}:predictLongRunning"
        payload: dict[str, object] = {
            "instances": [{"prompt": params.prompt}],
            "parameters": {
                "aspectRatio": params.aspect_ratio,
                "resolution": params.resolution,
            },
        }
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.post(
                endpoint,
                headers={
                    "x-goog-api-key": settings.gemini_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            raise ProviderError("E200", f"Google Veo 创建任务失败: HTTP {response.status_code} {response.text[:300]}")
        return response.json()

    async def _poll_operation(self, operation_name: str) -> dict:
        settings = get_settings()
        operation_url = f"{settings.gemini_api_base_url.rstrip('/')}/{operation_name}"
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for _ in range(60):
                response = await client.get(operation_url, headers={"x-goog-api-key": settings.gemini_api_key})
                if response.status_code >= 400:
                    raise ProviderError("E200", f"Google Veo 查询任务失败: HTTP {response.status_code} {response.text[:300]}")
                data = response.json()
                if data.get("done"):
                    if data.get("error"):
                        raise ProviderError("E200", f"Google Veo 任务失败: {data['error']}")
                    return data
                await asyncio.sleep(5)
        raise ProviderError("E203", f"Google Veo 任务超时未完成: {operation_name}", 504)

    async def _download_video(self, video_uri: str, output_path) -> None:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(video_uri, headers={"x-goog-api-key": settings.gemini_api_key})
        if response.status_code >= 400:
            raise ProviderError("E200", f"Google Veo 下载视频失败: HTTP {response.status_code}")
        output_path.write_bytes(response.content)

    @staticmethod
    def _extract_video_uri(operation: dict) -> str | None:
        response = operation.get("response") or {}
        video_response = response.get("generateVideoResponse") or response
        samples = video_response.get("generatedSamples") or video_response.get("generated_samples") or []
        if not samples:
            return None
        video = samples[0].get("video") if isinstance(samples[0], dict) else None
        if not isinstance(video, dict):
            return None
        uri = video.get("uri") or video.get("url")
        return str(uri) if uri else None
