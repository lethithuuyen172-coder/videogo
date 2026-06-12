"""素材管理请求和响应模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class MaterialUpdateReq(BaseModel):
    """更新素材标题和标签。"""

    title: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None
    is_subject: bool | None = None


class MaterialDispatchReq(BaseModel):
    """素材派发到生成器、画布或工具的事件请求。"""

    action: str = Field(default="use_as_input", max_length=80)
    target_type: str = Field(max_length=40)
    target_id: UUID | None = None
    target_route: str | None = Field(default=None, max_length=160)


class MaterialResp(BaseModel):
    """素材响应对象。"""

    id: UUID
    material_type: Literal["image", "video", "audio", "text"]
    source: str
    title: str
    url: str | None
    mime_type: str | None
    size_bytes: int | None
    tags: list[str]
    is_subject: bool = False
    status: str
    created_at: datetime


class MaterialReferenceResp(BaseModel):
    """素材引用链响应对象。"""

    id: UUID
    source_material_id: UUID | None
    target_material_id: UUID | None
    relation_type: str
    created_at: datetime
