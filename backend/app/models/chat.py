"""AI 对话模块模型。"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ConversationCreateReq(BaseModel):
    """新建对话请求。"""

    title: str = Field(default="新对话", max_length=120)
    skill_key: str = "general"


class ConversationResp(BaseModel):
    """对话响应。"""

    id: UUID
    title: str
    skill_key: str
    status: str
    created_at: datetime


class MessageCreateReq(BaseModel):
    """发送消息请求。"""

    content: str = Field(min_length=1, max_length=4000)
    referenced_materials: list[UUID] = Field(default_factory=list, max_length=12)


class MessageResp(BaseModel):
    """对话消息响应。"""

    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime
