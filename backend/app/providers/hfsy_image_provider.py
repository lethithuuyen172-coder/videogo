"""HFSY GPT-Image-2 provider."""

import base64
from uuid import uuid4

import httpx

from app.config import get_settings
from app.core.exceptions import AppError, ProviderError
from app.core.provider_base import BaseImageProvider, ImageGenParams, ProviderModel, ProviderResult


class HFSYImageProvider(BaseImageProvider):
    """Generate images through hfsyapi.cn GPT-Image-2 compatible endpoint."""

    provider_key = "hfsy"

    def get_model_list(self) -> list[ProviderModel]:
        configured = bool(self._api_keys())
        status = "configured" if configured else "coming_soon"
        return [
            ProviderModel(
                model_id="gpt-image-2",
                provider=self.provider_key,
                name="HFSY GPT-Image-2",
                modality="image",
                status=status,
                credit_cost=40,
            ),
            ProviderModel(
                model_id="gpt-image-2pro",
                provider=self.provider_key,
                name="HFSY GPT-Image-2 Pro",
                modality="image",
                status=status,
                credit_cost=80,
            ),
        ]

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        settings = get_settings()
        keys = self._api_keys()
        if not keys:
            raise AppError("E101", "请先配置 HFSY_IMAGE_API_KEYS", 400)

        size = self._size(model_id, params.aspect_ratio, params.resolution)
        payload: dict[str, object] = {
            "model": model_id,
            "n": 1,
            "size": size,
            "prompt": params.prompt,
            "response_format": "b64_json",
        }
        if params.reference_image_url:
            payload["reference_images"] = [params.reference_image_url]

        last_error: Exception | None = None
        for api_key in keys:
            try:
                async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                    response = await client.post(
                        settings.hfsy_image_base_url,
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        json=payload,
                    )
                if response.status_code >= 400:
                    raise ProviderError("E200", f"HFSY 图片生成失败: HTTP {response.status_code}")
                data = response.json()
                return self._result_from_payload(data, model_id, params, size)
            except Exception as exc:
                last_error = exc
                continue
        raise ProviderError("E200", f"HFSY 图片生成失败: {last_error}")

    def estimate_cost(self, model_id: str, resolution: str) -> int:
        if model_id == "gpt-image-2pro":
            return {"1024": 60, "2048": 90, "4096": 140}.get(resolution, 90)
        return 40

    @staticmethod
    def _api_keys() -> list[str]:
        keys = get_settings().hfsy_image_api_keys
        return [item.strip() for item in keys.split(",") if item.strip()]

    @staticmethod
    def _size(model_id: str, aspect_ratio: str, resolution: str) -> str:
        if model_id == "gpt-image-2":
            return "1024x1024"
        long_side = 4096 if resolution == "4096" else 2048 if resolution == "2048" else 1024
        if aspect_ratio == "9:16":
            return f"{int(long_side * 9 / 16)}x{long_side}"
        if aspect_ratio == "16:9":
            return f"{long_side}x{int(long_side * 9 / 16)}"
        if aspect_ratio == "4:5":
            return f"{int(long_side * 4 / 5)}x{long_side}"
        return f"{long_side}x{long_side}"

    @staticmethod
    def _result_from_payload(data: dict, model_id: str, params: ImageGenParams, size: str) -> ProviderResult:
        settings = get_settings()
        image = (data.get("data") or [{}])[0]
        remote_url = image.get("url")
        if remote_url:
            return ProviderResult(
                provider=HFSYImageProvider.provider_key,
                model_id=model_id,
                url=str(remote_url),
                storage_key=str(image.get("file_id") or data.get("task_id") or remote_url),
                metadata={"size": size, "task_id": str(data.get("task_id") or "")},
            )

        b64_data = image.get("b64_json") or image.get("b64_data")
        if not b64_data:
            raise ProviderError("E102", "HFSY 未返回图片 URL 或 base64 数据")
        params.output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.{params.image_format}"
        output_path = params.output_dir / filename
        output_path.write_bytes(base64.b64decode(str(b64_data)))
        return ProviderResult(
            provider=HFSYImageProvider.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={"size": size, "task_id": str(data.get("task_id") or "")},
        )
