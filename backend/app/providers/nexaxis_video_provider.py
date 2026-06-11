"""Nexaxis Veo video provider."""

import asyncio
from pathlib import Path

import httpx

from app.config import get_settings
from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import BaseVideoProvider, ProviderModel, ProviderResult, VideoGenParams


class NexaxisVideoProvider(BaseVideoProvider):
    """Generate Google Veo videos through Nexaxis task APIs."""

    provider_key = "nexaxis"
    model_id = "nexaxis-video"

    def get_model_list(self) -> list[ProviderModel]:
        settings = get_settings()
        configured = bool(self._api_keys())
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=f"Nexaxis {settings.nexaxis_video_model}",
                modality="video",
                status="configured" if configured else "coming_soon",
                credit_cost=120,
            )
        ]

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        settings = get_settings()
        api_keys = self._api_keys()
        if not api_keys:
            raise AppError("E101", "请先配置 NEXAXIS_API_KEY 或 NEXAXIS_API_KEYS", 400)

        endpoint = self._endpoint()
        duration = self._veo_duration(params.duration_seconds)
        size = self._size(params.aspect_ratio, params.resolution)
        payload = {
            "model": settings.nexaxis_video_model,
            "prompt": params.prompt,
            "duration": duration,
            "size": size,
            "metadata": {
                "resolution": params.resolution,
                "aspectRatio": params.aspect_ratio,
            },
            "n": 1,
        }

        response = None
        selected_key = api_keys[0]
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for api_key in api_keys:
                response = await client.post(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if response.status_code not in {401, 403, 429, 503}:
                    selected_key = api_key
                    break
                if response.status_code in {429, 503}:
                    continue
        if response is None or response.status_code >= 400:
            status = response.status_code if response is not None else "no_response"
            text = response.text[:300] if response is not None else ""
            raise ProviderError("E200", f"Nexaxis 创建 Veo 任务失败: HTTP {status} {text}")
        task = response.json()
        task_id = task.get("task_id") or task.get("id")
        if not task_id:
            raise ProviderError("E200", "Nexaxis 创建 Veo 任务未返回 task_id")

        completed = await self._poll_task(str(task_id), selected_key)
        await self._download_task(str(task_id), params.output_dir, selected_key)
        filename = f"{task_id}.mp4"
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={
                "task_id": str(task_id),
                "status": str(completed.get("status") or ""),
                "duration": duration,
                "aspect_ratio": params.aspect_ratio,
                "resolution": params.resolution,
            },
        )

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(120, duration_seconds * 8)

    @staticmethod
    def _endpoint() -> str:
        settings = get_settings()
        base = settings.nexaxis_base_url.rstrip("/")
        endpoint = settings.nexaxis_video_endpoint
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            return endpoint
        return f"{base}/{endpoint.lstrip('/')}"

    @staticmethod
    def _api_keys() -> list[str]:
        settings = get_settings()
        raw = ",".join(item for item in [settings.nexaxis_api_keys, settings.nexaxis_api_key] if item)
        return [item.strip() for item in raw.split(",") if item.strip()]

    @staticmethod
    def _veo_duration(duration_seconds: int) -> int:
        if duration_seconds <= 4:
            return 4
        if duration_seconds <= 6:
            return 6
        return 8

    @staticmethod
    def _size(aspect_ratio: str, resolution: str) -> str:
        if aspect_ratio == "9:16":
            return "720x1280" if resolution == "720p" else "1080x1920"
        if aspect_ratio == "1:1":
            return "720x720" if resolution == "720p" else "1080x1080"
        return "1280x720" if resolution == "720p" else "1920x1080"

    async def _poll_task(self, task_id: str, api_key: str) -> dict:
        settings = get_settings()
        task_url = f"{settings.nexaxis_base_url.rstrip('/')}/v1/videos/{task_id}"
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for _ in range(90):
                response = await client.get(task_url, headers={"Authorization": f"Bearer {api_key}"})
                if response.status_code >= 400:
                    raise ProviderError("E200", f"Nexaxis 查询 Veo 任务失败: HTTP {response.status_code} {response.text[:300]}")
                data = response.json()
                status = data.get("status")
                if status == "completed":
                    return data
                if status == "failed":
                    raise ProviderError("E200", f"Nexaxis Veo 任务失败: {data}")
                await asyncio.sleep(5)
        raise ProviderError("E203", f"Nexaxis Veo 任务超时未完成: {task_id}", 504)

    async def _download_task(self, task_id: str, output_dir: Path, api_key: str) -> None:
        settings = get_settings()
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{task_id}.mp4"
        url = f"{settings.nexaxis_base_url.rstrip('/')}/v1/videos/{task_id}/content"
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds, follow_redirects=True) as client:
            response = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
        if response.status_code >= 400:
            raise ProviderError("E200", f"Nexaxis 下载 Veo 视频失败: HTTP {response.status_code}")
        output_path.write_bytes(response.content)
