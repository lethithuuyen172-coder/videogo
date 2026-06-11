"""工具箱模块契约测试。"""

import pytest

from app.core.exceptions import AppError
from app.main import app
from app.services import tool_service
from app.services.tool_service import ToolService
from app.worker import tool_worker


def test_tool_routes_cover_enhance_and_coming_soon_tools() -> None:
    """工具箱必须暴露列表、画质增强和其余工具任务骨架。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/tools" in paths
    assert "/api/v1/tools/enhance/presets" in paths
    assert "/api/v1/tools/{tool_key}/tasks" in paths
    assert "/api/v1/tools/subtitle-erase/tasks" in paths
    assert "/api/v1/tools/watermark-remove/tasks" in paths
    assert "/api/v1/tools/prompt-reverse/tasks" in paths
    assert "/api/v1/tools/video-prompt/tasks" in paths


def test_tool_catalog_contains_six_prd_tools() -> None:
    """工具箱目录必须包含 PRD V1.0 定义的 6 个工具。"""
    tools = ToolService().list_tools()
    keys = {item["tool_key"] for item in tools}
    assert keys == {
        "enhance",
        "subtitle-erase",
        "watermark-remove",
        "viral-remix",
        "prompt-reverse",
        "video-prompt",
    }
    assert next(item for item in tools if item["tool_key"] == "enhance")["status"] == "available"


@pytest.mark.asyncio
async def test_coming_soon_tool_returns_e201_without_db() -> None:
    """未开放工具必须在入库前返回 E201。"""
    with pytest.raises(AppError) as exc:
        await ToolService().create_task(
            user_id="00000000-0000-0000-0000-000000000000",
            tool_key="subtitle-erase",
            payload={},
        )
    assert exc.value.code == "E201"


def test_tool_worker_default_output_is_public_storage_url(tmp_path, monkeypatch) -> None:
    """工具 Worker 的默认输出必须是可访问 URL，而不是 mock:// 占位。"""

    class FakeSettings:
        local_storage_path = str(tmp_path)
        public_base_url = "http://localhost:8000"

    monkeypatch.setattr(tool_worker, "get_settings", lambda: FakeSettings())
    url = tool_worker._ensure_tool_output("00000000-0000-0000-0000-000000000001")
    assert url == "http://localhost:8000/storage/generated/tool-enhance-00000000-0000-0000-0000-000000000001.txt"
    assert (tmp_path / "generated" / "tool-enhance-00000000-0000-0000-0000-000000000001.txt").exists()


@pytest.mark.asyncio
async def test_enhance_tool_task_is_enqueued_to_worker(monkeypatch) -> None:
    """画质增强创建后必须进入 tool:normal，保证 Worker 能消费。"""
    calls: list[tuple[str, str, tuple[str, ...]]] = []

    class FakeConnection:
        async def fetchrow(self, *args):
            return {
                "id": "00000000-0000-0000-0000-000000000010",
                "status": "queued",
                "credit_cost": 30,
            }

    class FakeAcquire:
        async def __aenter__(self):
            return FakeConnection()

        async def __aexit__(self, exc_type, exc, tb):
            return None

    class FakePool:
        def acquire(self):
            return FakeAcquire()

    async def fake_get_pool() -> FakePool:
        return FakePool()

    class FakeTaskQueue:
        def enqueue(self, queue_name: str, func: str, *args: str) -> str:
            calls.append((queue_name, func, args))
            return "rq_tool_job"

    monkeypatch.setattr(tool_service, "get_pool", fake_get_pool)
    monkeypatch.setattr(tool_service, "task_queue", FakeTaskQueue())

    row = await ToolService().create_task(
        user_id="00000000-0000-0000-0000-000000000001",
        tool_key="enhance",
        payload={},
    )

    assert row["rq_job_id"] == "rq_tool_job"
    assert calls == [
        (
            "tool:normal",
            "app.worker.tool_worker.process_tool_task",
            ("00000000-0000-0000-0000-000000000010",),
        )
    ]
