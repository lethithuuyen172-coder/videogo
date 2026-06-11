"""OpenAI DALL-E image provider."""

import base64
from uuid import uuid4

from openai import AsyncOpenAI

from app.config import get_settings
from app.core.exceptions import AppError
from app.core.provider_base import BaseImageProvider, ImageGenParams, ProviderModel, ProviderResult


class OpenAIImageProvider(BaseImageProvider):
    """Generate images through OpenAI's image API and persist local files."""

    provider_key = "openai"

    def get_model_list(self) -> list[ProviderModel]:
        settings = get_settings()
        configured = bool(settings.dalle_api_key and settings.dalle_api_key != "sk-your-key-here")
        return [
            ProviderModel(
                model_id="dalle-3",
                provider=self.provider_key,
                name="DALL-E 3",
                modality="image",
                status="configured" if configured else "coming_soon",
                credit_cost=50,
            )
        ]

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        settings = get_settings()
        api_key = params.openai_api_key or settings.dalle_api_key
        if not api_key or api_key == "sk-your-key-here":
            raise AppError("E101", "请先配置 DALLE_API_KEY 或在浏览器填写 OpenAI Key", 400)

        params.output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.{params.image_format}"
        output_path = params.output_dir / filename
        size = self._openai_size(params.aspect_ratio)
        client = AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model=model_id,
            prompt=params.prompt,
            size=size,
            n=1,
            response_format="b64_json",
        )
        b64_json = response.data[0].b64_json if response.data else None
        if not b64_json:
            raise AppError("E102", "OpenAI 未返回图片数据", 502)
        output_path.write_bytes(base64.b64decode(b64_json))
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={
                "size": size,
                "format": params.image_format,
                "requested_resolution": params.resolution,
            },
        )

    def estimate_cost(self, model_id: str, resolution: str) -> int:
        return 80 if resolution == "2048" else 50

    @staticmethod
    def _openai_size(aspect_ratio: str) -> str:
        if aspect_ratio == "9:16":
            return "1024x1792"
        if aspect_ratio == "16:9":
            return "1792x1024"
        return "1024x1024"
