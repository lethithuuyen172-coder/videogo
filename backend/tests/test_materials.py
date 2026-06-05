"""素材管理契约测试。"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.materials import MaterialResp
from app.services.material_service import MaterialService


def test_material_routes_match_prd_contract() -> None:
    """素材模块必须暴露 PRD 指定的上传、引用链、批量删除和预签名接口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/materials" in paths
    assert "/api/v1/materials/{material_id}/references" in paths
    assert "/api/v1/materials/batch-delete" in paths
    assert "/api/v1/materials/upload-url" in paths


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
