"""视频和图片 Provider 的统一抽象，业务层只依赖这些模型和接口。"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class ProviderModel(BaseModel):
    """前端模型选择器展示所需的模型元数据。"""

    model_id: str
    provider: str
    name: str
    modality: Literal["video", "image"]
    status: Literal["available", "configured", "coming_soon"]
    credit_cost: int


class VideoGenParams(BaseModel):
    """视频生成参数，兼容文生视频和图生视频。"""

    prompt: str = Field(min_length=1, max_length=4000)
    duration_seconds: int = Field(default=8, ge=4, le=300)
    aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16"
    resolution: Literal["720p", "1080p"] = "720p"
    reference_image_url: str | None = None
    output_dir: Path = Path("./storage/generated")


class ImageGenParams(BaseModel):
    """图片生成参数，兼容文生图和图生图。"""

    prompt: str = Field(min_length=1, max_length=2000)
    aspect_ratio: Literal["1:1", "9:16", "16:9", "4:5"] = "1:1"
    resolution: Literal["512", "1024", "2048", "4096"] = "1024"
    image_format: Literal["png", "jpeg", "webp"] = "png"
    reference_image_url: str | None = None
    output_dir: Path = Path("./storage/generated")
    openai_api_key: str | None = None


class ProviderResult(BaseModel):
    """Provider 生成结果，写回任务表和素材表。"""

    provider: str
    model_id: str
    url: str
    storage_key: str
    metadata: dict[str, str | int | float]


class BaseVideoProvider(ABC):
    """AI 视频 Provider 抽象基类。"""

    provider_key: str

    @abstractmethod
    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        """生成视频并返回产物信息。"""

    @abstractmethod
    def get_model_list(self) -> list[ProviderModel]:
        """返回该 Provider 支持的视频模型列表。"""

    @abstractmethod
    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        """估算视频任务积分消耗。"""


class BaseImageProvider(ABC):
    """AI 图片 Provider 抽象基类。"""

    provider_key: str

    @abstractmethod
    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        """生成图片并返回产物信息。"""

    @abstractmethod
    def get_model_list(self) -> list[ProviderModel]:
        """返回该 Provider 支持的图片模型列表。"""

    @abstractmethod
    def estimate_cost(self, model_id: str, resolution: str) -> int:
        """估算图片任务积分消耗。"""
