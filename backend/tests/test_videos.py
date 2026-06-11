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
    assert "/api/v1/videos/scripts/templates" in paths
    assert "/api/v1/videos/models" in paths
    assert "/api/v1/videos" in paths
    assert "/api/v1/videos/{job_id}/enqueue" in paths
    assert "/api/v1/videos/{job_id}/run-now" in paths


def test_video_request_limits_match_prd() -> None:
    """视频时长、比例、分辨率和提示词长度必须被模型约束。"""
    assert VideoCreateReq(prompt="demo", duration_seconds=40).duration_seconds == 40
    assert VideoCreateReq(prompt="demo", duration_seconds=300).duration_seconds == 300
    with pytest.raises(ValidationError):
        VideoCreateReq(prompt="demo", duration_seconds=301)
    with pytest.raises(ValidationError):
        VideoCreateReq(prompt="demo", aspect_ratio="21:9")


def test_script_language_and_duration_are_limited() -> None:
    """脚本生成只允许 PRD 定义的时长、语言和平台。"""
    assert ScriptGenerateReq(product_name="杯子", duration_seconds=30, language="vi").language == "vi"
    with pytest.raises(ValidationError):
        ScriptGenerateReq(product_name="杯子", duration_seconds=20)
    with pytest.raises(ValidationError):
        ScriptGenerateReq(product_name="杯子", platform="kuaishou")
    with pytest.raises(ValidationError):
        ProductAnalysisReq(material_id="bad")


def test_script_skill_templates_cover_bought_prompt_pack() -> None:
    """内置脚本 Skill 必须覆盖买来视频脚本目录中的双平台 108 个模板。"""
    from app.services.generation_service import GenerationService

    service = GenerationService()
    templates = service.list_script_templates()
    assert len(templates) == 108
    assert {item["platform"] for item in templates} == {"tiktok", "douyin"}
    assert any(item["key"] == "tiktok-28" and item["name"] == "GPT故事板分镜图" for item in templates)
    assert any(item["key"] == "douyin-082" and item["name"] == "抖音GPT故事板分镜图" for item in templates)


def test_script_generation_uses_selected_skill_template() -> None:
    """脚本生成应输出分镜和可直接送入视频生成的 prompt。"""
    from app.services.generation_service import GenerationService

    script = GenerationService().generate_script(
        ScriptGenerateReq(
            product_name="便携榨汁杯",
            platform="douyin",
            template_key="douyin-082",
            target_market="三四线城市",
            target_audience="30岁宝妈",
            selling_points=["一键清洗", "杯身轻便", "早餐更省事"],
            call_to_action="左下角小黄车领券",
        )
    )
    assert script["template"]["key"] == "douyin-082"
    assert script["hook_rule"] == "2.7秒留人"
    assert len(script["script"]) == 8
    assert "便携榨汁杯" in script["video_prompt"]
    assert "Product lock" in script["video_prompt"]
