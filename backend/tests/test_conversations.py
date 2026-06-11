"""AI 对话模块契约测试。"""

import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import get_settings
from app.main import app
from app.models.chat import ConversationCreateReq, MessageCreateReq
from app.routers.auth import get_current_user
from app.routers.conversations import get_conversation_service
from app.services.conversation_service import ConversationService


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


def test_stream_route_returns_json_error_when_openai_key_missing(monkeypatch) -> None:
    """缺少 OpenAI Key 时，SSE 路由必须在响应开始前返回统一错误。"""
    get_settings.cache_clear()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-your-key-here")
    app.dependency_overrides[get_current_user] = lambda: {"id": uuid4()}
    try:
        response = TestClient(app).post(
            f"/api/v1/conversations/{uuid4()}/stream",
            json={"content": "hello"},
        )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    body = response.json()
    assert response.status_code == 400
    assert body["success"] is False
    assert body["error"]["code"] == "E101"


def test_stream_route_accepts_browser_openai_key_header(monkeypatch) -> None:
    """浏览器填写的 OpenAI Key 必须能覆盖占位环境变量。"""
    get_settings.cache_clear()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-your-key-here")
    user_id = uuid4()

    class FakeConversationService:
        async def stream_chat(self, current_user_id, conversation_id, user_content, openai_api_key=None):
            assert current_user_id == user_id
            assert user_content == "hello"
            assert openai_api_key == "sk-browser"
            yield "data: [DONE]\n\n"

    app.dependency_overrides[get_current_user] = lambda: {"id": user_id}
    app.dependency_overrides[get_conversation_service] = lambda: FakeConversationService()
    try:
        response = TestClient(app).post(
            f"/api/v1/conversations/{uuid4()}/stream",
            json={"content": "hello"},
            headers={"X-OpenAI-API-Key": "sk-browser"},
        )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    assert response.status_code == 200
    assert response.text == "data: [DONE]\n\n"


@pytest.mark.asyncio
async def test_stream_chat_yields_sse_tokens_and_persists_messages(monkeypatch) -> None:
    """SSE 对话必须输出 token 事件、结束事件，并持久化用户和助手消息。"""
    get_settings.cache_clear()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://apiopenclaw.com/v1")
    monkeypatch.setenv("OPENAI_CHAT_MODEL", "openclaw-chat")
    user_id = uuid4()
    conversation_id = uuid4()
    executed: list[tuple[str, tuple]] = []
    captured_messages: list[list[dict[str, str]]] = []

    class FakeAcquire:
        async def __aenter__(self):
            return FakeConnection()

        async def __aexit__(self, exc_type, exc, tb):
            return None

    class FakePool:
        def acquire(self):
            return FakeAcquire()

    class FakeConnection:
        async def fetchval(self, *args):
            return user_id

        async def fetch(self, *args):
            return [
                {"role": "assistant", "content": "old answer"},
                {"role": "user", "content": "old question"},
            ]

        async def execute(self, sql, *args):
            executed.append((sql, args))
            return "INSERT 0 1"

    class FakeDelta:
        def __init__(self, content: str) -> None:
            self.content = content

    class FakeChoice:
        def __init__(self, content: str) -> None:
            self.delta = FakeDelta(content)

    class FakeChunk:
        def __init__(self, content: str) -> None:
            self.choices = [FakeChoice(content)]

    class FakeStream:
        def __aiter__(self):
            self.tokens = iter(["你", "好"])
            return self

        async def __anext__(self):
            try:
                return FakeChunk(next(self.tokens))
            except StopIteration as exc:
                raise StopAsyncIteration from exc

    class FakeCompletions:
        async def create(self, **kwargs):
            captured_messages.append(kwargs["messages"])
            assert kwargs["model"] == "openclaw-chat"
            assert kwargs["stream"] is True
            return FakeStream()

    class FakeChat:
        def __init__(self) -> None:
            self.completions = FakeCompletions()

    class FakeClient:
        def __init__(self, api_key: str, base_url: str) -> None:
            assert api_key == "sk-test"
            assert base_url == "https://apiopenclaw.com/v1"
            self.chat = FakeChat()

    async def fake_get_pool() -> FakePool:
        return FakePool()

    monkeypatch.setattr("app.services.conversation_service.get_pool", fake_get_pool)
    monkeypatch.setattr("app.services.conversation_service.AsyncOpenAI", FakeClient)

    chunks = [
        chunk
        async for chunk in ConversationService().stream_chat(user_id, conversation_id, "new question")
    ]

    assert [json.loads(item.removeprefix("data: ").strip()) for item in chunks[:2]] == [
        {"token": "你"},
        {"token": "好"},
    ]
    assert chunks[-1] == "data: [DONE]\n\n"
    assert captured_messages == [[
        {"role": "user", "content": "old question"},
        {"role": "assistant", "content": "old answer"},
        {"role": "user", "content": "new question"},
    ]]
    assert any(args[-1] == "new question" for _, args in executed)
    assert any(args[-1] == "你好" for _, args in executed)
    get_settings.cache_clear()
