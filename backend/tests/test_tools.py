"""工具箱模块契约测试。"""

import pytest

from app.core.exceptions import AppError
from app.main import app
from app.services.tool_service import ToolService


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
