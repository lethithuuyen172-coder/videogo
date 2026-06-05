"""Mock 图片 Provider，使用 Pillow 生成带提示词标记的测试图。"""

from uuid import uuid4

from PIL import Image, ImageDraw, ImageFont

from app.config import get_settings
from app.core.provider_base import BaseImageProvider, ImageGenParams, ProviderModel, ProviderResult


class MockImageProvider(BaseImageProvider):
    """本地端到端图片生成 Provider。"""

    provider_key = "mock"

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        params.output_dir.mkdir(parents=True, exist_ok=True)
        width, height = self._size(params.aspect_ratio, params.resolution)
        image = Image.new("RGB", (width, height), "#101827")
        draw = ImageDraw.Draw(image)
        for y in range(height):
            shade = int(30 + (y / height) * 100)
            draw.line([(0, y), (width, y)], fill=(shade, 60, 120))
        text = f"Mock Image\n{params.prompt[:120]}"
        draw.multiline_text((40, 40), text, fill="white", font=ImageFont.load_default(), spacing=8)
        filename = f"{uuid4().hex}.{params.image_format}"
        output_path = params.output_dir / filename
        image.save(output_path)
        settings = get_settings()
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={"width": width, "height": height, "format": params.image_format},
        )

    def get_model_list(self) -> list[ProviderModel]:
        return [
            ProviderModel(
                model_id="mock-image",
                provider=self.provider_key,
                name="Mock Image",
                modality="image",
                status="available",
                credit_cost=5,
            )
        ]

    def estimate_cost(self, model_id: str, resolution: str) -> int:
        return {"512": 3, "1024": 5, "2048": 10, "4096": 20}.get(resolution, 5)

    @staticmethod
    def _size(aspect_ratio: str, resolution: str) -> tuple[int, int]:
        base = int(resolution)
        sizes = {
            "1:1": (base, base),
            "9:16": (int(base * 9 / 16), base),
            "16:9": (base, int(base * 9 / 16)),
            "4:5": (int(base * 4 / 5), base),
        }
        return sizes[aspect_ratio]
