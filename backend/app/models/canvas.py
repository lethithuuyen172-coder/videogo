"""画布模块模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CanvasCreateReq(BaseModel):
    """创建画布请求。"""

    title: str = Field(default="未命名画布", max_length=120)
    width: int = Field(default=1080, ge=320, le=4096)
    height: int = Field(default=1920, ge=320, le=4096)
    background_color: str = "#ffffff"


class CanvasResp(BaseModel):
    """画布响应。"""

    id: UUID
    title: str
    width: int
    height: int
    background_color: str
    thumbnail_url: str | None = None
    status: str
    created_at: datetime


class CanvasUpdateReq(BaseModel):
    """更新画布基础信息请求。"""

    title: str | None = Field(default=None, max_length=120)
    background_color: str | None = None


class CanvasElementReq(BaseModel):
    """画布元素创建/更新请求。"""

    element_type: Literal["image", "text", "rect", "circle", "line"]
    z_index: int = 0
    x: float = 0
    y: float = 0
    width: float = 100
    height: float = 100
    rotation: float = 0
    locked: bool = False
    visible: bool = True
    props: dict = Field(default_factory=dict)


class CanvasElementResp(CanvasElementReq):
    """画布元素响应。"""

    id: UUID
    canvas_id: UUID
    created_at: datetime
