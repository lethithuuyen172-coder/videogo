"""视频和图片生成模块模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class VideoCreateReq(BaseModel):
    """创建视频生成任务请求。"""

    prompt: str = Field(min_length=1, max_length=4000)
    model_id: str = "mock-video"
    material_id: UUID | None = None
    duration_seconds: int = Field(default=15, ge=5, le=40)
    aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16"
    resolution: Literal["720p", "1080p"] = "720p"


class ImageCreateReq(BaseModel):
    """创建图片生成任务请求。"""

    prompt: str = Field(min_length=1, max_length=2000)
    model_id: str = "mock-image"
    material_id: UUID | None = None
    aspect_ratio: Literal["1:1", "9:16", "16:9", "4:5"] = "1:1"
    resolution: Literal["512", "1024", "2048", "4096"] = "1024"
    image_format: Literal["png", "jpeg", "webp"] = "png"


class JobResp(BaseModel):
    """生成任务通用响应。"""

    id: UUID
    model_id: str
    provider_key: str
    status: str
    progress: int
    credit_cost: int
    output_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime


class ProductAnalysisReq(BaseModel):
    """产品图分析请求。"""

    material_id: UUID
    language: Literal["zh", "en", "ja", "ko", "th", "vi"] = "zh"


class ScriptGenerateReq(BaseModel):
    """FABE-S 脚本生成请求。"""

    product_name: str = Field(min_length=1, max_length=120)
    selling_points: list[str] = Field(default_factory=list, max_length=8)
    duration_seconds: Literal[15, 30, 40] = 15
    language: Literal["zh", "en", "ja", "ko", "th", "vi"] = "zh"
