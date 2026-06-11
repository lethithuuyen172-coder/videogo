"""画布模块契约测试。"""

import pytest
from PIL import Image, ImageDraw
from pydantic import ValidationError

from app.main import app
from app.models.canvas import CanvasCreateReq, CanvasElementReq
from app.services.canvas_service import CanvasService


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
    """画布元素类型只允许数据库 schema 支持的基础类型。"""
    assert CanvasElementReq(element_type="text").element_type == "text"
    with pytest.raises(ValidationError):
        CanvasElementReq(element_type="unknown")


def test_canvas_export_draws_shape_pixels() -> None:
    """导出绘制逻辑应生成真实图像像素，不再返回 mock URL 即结束。"""
    image = Image.new("RGB", (64, 64), "#ffffff")
    draw = ImageDraw.Draw(image)
    CanvasService._draw_element(
        draw,
        {
            "element_type": "rect",
            "x": 8,
            "y": 8,
            "width": 24,
            "height": 24,
            "z_index": 1,
            "visible": True,
            "props": {"fill": "#0f766e"},
        },
    )
    assert image.getpixel((12, 12)) == (15, 118, 110)
