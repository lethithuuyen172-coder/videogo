"""Mock 视频 Provider，使用 FFmpeg 生成可播放测试 MP4。"""

import asyncio
from uuid import uuid4

from app.config import get_settings
from app.core.exceptions import ProviderError
from app.core.provider_base import BaseVideoProvider, ProviderModel, ProviderResult, VideoGenParams


class MockVideoProvider(BaseVideoProvider):
    """本地端到端视频生成 Provider，用于开发、CI 和降级。"""

    provider_key = "mock"

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        params.output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.mp4"
        output_path = params.output_dir / filename
        width, height = self._size(params.aspect_ratio, params.resolution)
        draw_text = params.prompt[:60].replace(":", "").replace("'", "")
        command = [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=0x121826:s={width}x{height}:d={params.duration_seconds}",
            "-vf",
            f"drawtext=text='{draw_text}':fontcolor=white:fontsize=28:x=40:y=40",
            "-pix_fmt",
            "yuv420p",
            str(output_path),
        ]
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode != 0:
            raise ProviderError("E200", f"Mock视频生成失败: {stderr.decode(errors='ignore')}")
        settings = get_settings()
        return ProviderResult(
            provider=self.provider_key,
            model_id=model_id,
            url=f"{settings.public_base_url}/storage/generated/{filename}",
            storage_key=f"generated/{filename}",
            metadata={"width": width, "height": height, "duration": params.duration_seconds},
        )

    def get_model_list(self) -> list[ProviderModel]:
        return [
            ProviderModel(
                model_id="mock-video",
                provider=self.provider_key,
                name="Mock Video",
                modality="video",
                status="available",
                credit_cost=10,
            )
        ]

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(10, duration_seconds)

    @staticmethod
    def _size(aspect_ratio: str, resolution: str) -> tuple[int, int]:
        long_side = 1080 if resolution == "1080p" else 720
        sizes = {
            "9:16": (int(long_side * 9 / 16), long_side),
            "16:9": (long_side, int(long_side * 9 / 16)),
            "1:1": (long_side, long_side),
        }
        return sizes[aspect_ratio]
