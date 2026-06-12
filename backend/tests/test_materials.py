"""素材管理契约测试。"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.materials import (
    MaterialCreateFromUrlReq,
    MaterialDispatchReq,
    MaterialResp,
    MaterialUpdateReq,
)
from app.services import material_service as material_module
from app.services.material_service import MaterialService


def test_material_routes_match_prd_contract() -> None:
    """素材模块必须暴露 PRD 指定的上传、引用链、批量删除和预签名接口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/materials" in paths
    assert "/api/v1/materials/{material_id}/references" in paths
    assert "/api/v1/materials/batch-delete" in paths
    assert "/api/v1/materials/upload-url" in paths
    assert "/api/v1/materials/from-url" in paths
    assert "patch" in paths["/api/v1/materials/{material_id}"]


def test_material_type_is_mapped_from_supported_mime() -> None:
    """MIME 类型必须映射到素材类型枚举。"""
    assert MaterialService._type_from_mime("image/png") == "image"
    assert MaterialService._type_from_mime("video/mp4") == "video"
    assert MaterialService._type_from_mime("audio/mpeg") == "audio"
    assert MaterialService._type_from_mime("text/plain") == "text"


def test_material_response_rejects_unknown_type() -> None:
    """素材响应不能接受 PRD 类型集合之外的值。"""
    with pytest.raises(ValidationError):
        MaterialResp(
            id=uuid4(),
            material_type="binary",
            source="upload",
            title="bad",
            url=None,
            mime_type=None,
            size_bytes=None,
            tags=[],
            status="active",
            created_at=datetime.now(UTC),
        )


def test_material_update_and_response_support_subject_flag() -> None:
    """素材可标记为主体，供首页 @ 选择器和生成器上下文复用。"""
    req = MaterialUpdateReq(is_subject=True)
    assert req.is_subject is True
    material = MaterialResp(
        id=uuid4(),
        material_type="image",
        source="upload",
        title="subject",
        url="http://example.com/a.png",
        mime_type="image/png",
        size_bytes=1,
        tags=[],
        is_subject=True,
        status="active",
        created_at=datetime.now(UTC),
    )
    assert material.is_subject is True


def test_material_dispatch_route_and_model_contract() -> None:
    """素材派发接口必须存在，并携带目标类型和路由上下文。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/materials/{material_id}/dispatch" in paths
    req = MaterialDispatchReq(target_type="image", target_route="/image")
    assert req.action == "use_as_input"
    assert req.target_type == "image"


def test_material_from_url_model_contract() -> None:
    """任务输出 URL 可作为素材引用保存，不复制文件二进制。"""
    task_id = uuid4()
    req = MaterialCreateFromUrlReq(
        url="http://localhost:8000/storage/generated/out.png",
        title="AI 图片输出",
        material_type="image",
        source_task_type="image",
        source_task_id=task_id,
        tags=["task-output"],
    )
    assert req.source_task_id == task_id
    assert req.material_type == "image"


@pytest.mark.asyncio
async def test_material_dispatch_logs_usage_event(monkeypatch) -> None:
    """素材派发必须写入 material_usage_events 的服务层入口。"""
    calls: list[tuple] = []
    user_id = uuid4()
    material_id = uuid4()

    class FakeMaterialService(MaterialService):
        async def get(self, user_id_arg, material_id_arg) -> dict:
            assert user_id_arg == user_id
            assert material_id_arg == material_id
            return {
                "id": material_id,
                "material_type": "image",
                "title": "商品图",
                "url": "http://localhost:8000/storage/a.png",
            }

    class FakeEventService:
        async def log_material_usage_event(
            self,
            user_id_arg,
            material_id_arg,
            action,
            target_type=None,
            target_id=None,
            payload=None,
        ) -> None:
            calls.append((user_id_arg, material_id_arg, action, target_type, target_id, payload))

    monkeypatch.setattr(material_module, "event_service", FakeEventService())

    result = await FakeMaterialService().dispatch(
        user_id,
        material_id,
        MaterialDispatchReq(target_type="image", target_route="/image"),
    )

    assert result["dispatched"] is True
    assert calls[0][0:4] == (user_id, material_id, "use_as_input", "image")
    assert calls[0][5]["target_route"] == "/image"


@pytest.mark.asyncio
async def test_create_from_url_returns_existing_material(monkeypatch) -> None:
    """同一用户同一输出 URL 重复保存时必须幂等返回已有素材。"""
    user_id = uuid4()
    material_id = uuid4()

    class FakeConnection:
        async def fetchrow(self, query: str, *args):
            if "SELECT * FROM public.materials" in query:
                return {
                    "id": material_id,
                    "user_id": user_id,
                    "material_type": "image",
                    "source": "task_output",
                    "title": "existing",
                    "url": args[1],
                    "mime_type": "image/png",
                    "size_bytes": 0,
                    "tags": ["task-output"],
                    "is_subject": False,
                    "status": "active",
                    "created_at": datetime.now(UTC),
                }
            raise AssertionError("existing material should avoid insert")

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

    monkeypatch.setattr(material_module, "get_pool", fake_get_pool)
    result = await MaterialService().create_from_url(
        user_id,
        MaterialCreateFromUrlReq(
            url="http://localhost:8000/storage/generated/out.png",
            title="new",
            material_type="image",
        ),
    )

    assert result["id"] == material_id
