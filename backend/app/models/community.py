"""社区发现模块模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class WorkCreateReq(BaseModel):
    """发布作品请求，默认进入审核队列。"""

    work_type: Literal["video", "image", "canvas"]
    title: str = Field(min_length=1, max_length=120)
    description: str | None = None
    material_id: UUID | None = None
    canvas_id: UUID | None = None
    cover_url: str | None = None


class WorkResp(BaseModel):
    """社区作品响应。"""

    id: UUID
    work_type: Literal["video", "image", "canvas"]
    title: str
    description: str | None
    cover_url: str | None
    status: str
    like_count: int
    bookmark_count: int
    created_at: datetime
