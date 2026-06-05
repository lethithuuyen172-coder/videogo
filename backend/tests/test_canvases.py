"""画布模块契约测试。"""

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.canvas import CanvasCreateReq, CanvasElementReq


def test_canvas_routes_include_update_delete_and_export() -> None:
    """画布模块必须覆盖创建、查询、更新、删除、导出和元素编辑接口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/canvases" in paths
    assert "put" in paths["/api/v1/canvases/{canvas_id}"]
    assert "delete" in paths["/api/v1/canvases/{canvas_id}"]
    assert "/api/v1/canvases/{canvas_id}/export" in paths
    assert "/api/v1/canvases/{canvas_id}/elements" in paths


def test_canvas_size_is_limited_to_4k() -> None:
    """画布尺寸必须受 4K 上限约束。"""
    assert CanvasCreateReq(width=4096, height=4096).width == 4096
    with pytest.raises(ValidationError):
        CanvasCreateReq(width=4097)


def test_canvas_element_type_is_enumerated() -> None:
    """画布元素类型只允许图片、文字、形状和贴纸。"""
    assert CanvasElementReq(element_type="text").element_type == "text"
    with pytest.raises(ValidationError):
        CanvasElementReq(element_type="unknown")
