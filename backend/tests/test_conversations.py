"""AI 对话模块契约测试。"""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.chat import ConversationCreateReq, MessageCreateReq


def test_conversation_routes_cover_history_and_sse() -> None:
    """对话模块必须暴露会话、历史消息和 SSE 流式接口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/conversations" in paths
    assert "/api/v1/conversations/{conversation_id}/messages" in paths
    assert "/api/v1/conversations/{conversation_id}/stream" in paths


def test_conversation_and_message_models_validate_limits() -> None:
    """对话标题、消息长度和引用素材数量必须受模型约束。"""
    assert ConversationCreateReq(skill_key="video").skill_key == "video"
    assert MessageCreateReq(content="hello", referenced_materials=[uuid4()]).content == "hello"
    with pytest.raises(ValidationError):
        MessageCreateReq(content="")
    with pytest.raises(ValidationError):
        MessageCreateReq(content="x" * 4001)
    with pytest.raises(ValidationError):
        MessageCreateReq(content="hello", referenced_materials=[uuid4() for _ in range(13)])
