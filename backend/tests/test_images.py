"""AI 图片模块契约测试。"""

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.generation import ImageCreateReq


def test_image_routes_cover_models_styles_and_queue() -> None:
    """图片模块必须暴露模型、风格、任务和队列入口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/images/models" in paths
    assert "/api/v1/images/styles" in paths
    assert "/api/v1/images" in paths
    assert "/api/v1/images/{job_id}/enqueue" in paths
    assert "/api/v1/images/{job_id}/run-now" in paths


def test_image_request_limits_match_prd() -> None:
    """图片比例、分辨率和格式必须被模型约束。"""
    assert ImageCreateReq(prompt="demo", aspect_ratio="4:5", resolution="4096").resolution == "4096"
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", aspect_ratio="3:2")
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", resolution="8192")
    with pytest.raises(ValidationError):
        ImageCreateReq(prompt="demo", image_format="gif")
