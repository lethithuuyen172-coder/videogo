"""AI 视频模块契约测试。"""

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.generation import ProductAnalysisReq, ScriptGenerateReq, VideoCreateReq


def test_video_routes_cover_analysis_models_and_queue() -> None:
    """视频模块必须暴露分析、脚本、模型、任务和队列入口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/videos/product-analysis" in paths
    assert "/api/v1/videos/scripts" in paths
    assert "/api/v1/videos/models" in paths
    assert "/api/v1/videos" in paths
    assert "/api/v1/videos/{job_id}/enqueue" in paths
    assert "/api/v1/videos/{job_id}/run-now" in paths


def test_video_request_limits_match_prd() -> None:
    """视频时长、比例、分辨率和提示词长度必须被模型约束。"""
    assert VideoCreateReq(prompt="demo", duration_seconds=40).duration_seconds == 40
    with pytest.raises(ValidationError):
        VideoCreateReq(prompt="demo", duration_seconds=41)
    with pytest.raises(ValidationError):
        VideoCreateReq(prompt="demo", aspect_ratio="21:9")


def test_script_language_and_duration_are_limited() -> None:
    """FABE-S 脚本只允许 PRD 定义的时长和语言。"""
    assert ScriptGenerateReq(product_name="杯子", duration_seconds=30, language="vi").language == "vi"
    with pytest.raises(ValidationError):
        ScriptGenerateReq(product_name="杯子", duration_seconds=20)
    with pytest.raises(ValidationError):
        ProductAnalysisReq(material_id="bad")
