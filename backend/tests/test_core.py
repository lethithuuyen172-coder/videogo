"""不依赖外部服务的核心单元测试。"""

from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.provider_router import provider_router
from app.core.responses import fail, ok
from app.core.security import create_jwt
from app.main import app
from app.models.generation import ProductAnalysisReq, ScriptGenerateReq
from app.services.generation_service import GenerationService


def test_api_response_contract() -> None:
    """成功和失败响应都包含 PRD 要求的顶层字段。"""
    success = ok({"value": 1})
    error = fail("E001", "请求参数错误")
    assert success["success"] is True
    assert success["request_id"].startswith("req_")
    assert error["success"] is False
    assert error["error"]["code"] == "E001"


def test_provider_router_lists_mock_models() -> None:
    """mock 视频和图片模型必须始终可用。"""
    models = {item.model_id: item for item in provider_router.list_models()}
    assert models["mock-video"].status == "available"
    assert models["mock-image"].status == "available"


def test_generation_service_mock_analysis_and_script() -> None:
    """产品分析和带货脚本生成返回稳定结构。"""
    service = GenerationService()
    analysis = service.analyze_product(ProductAnalysisReq(material_id=uuid4()))
    script = service.generate_script(ScriptGenerateReq(product_name="测试产品"))
    assert analysis["kol_persona"]["style"]
    assert script["template"]["key"] == "tiktok-28"
    assert len(script["script"]) == 8
    assert "测试产品" in script["video_prompt"]


def test_create_jwt_returns_token() -> None:
    """JWT 签发返回可传输字符串。"""
    token = create_jwt(str(uuid4()), "access", {"role": "user"})
    assert isinstance(token, str)
    assert token.count(".") == 2


def test_generated_storage_files_are_publicly_served() -> None:
    """生成图片、画布导出和工具输出依赖 /storage/generated 可访问。"""
    generated = Path("./storage/generated")
    generated.mkdir(parents=True, exist_ok=True)
    target = generated / "static-contract.txt"
    target.write_text("ok", encoding="utf-8")
    try:
        response = TestClient(app).get("/storage/generated/static-contract.txt")
    finally:
        target.unlink(missing_ok=True)
    assert response.status_code == 200
    assert response.text == "ok"


def test_health_check_tracks_real_rq_queues() -> None:
    """健康检查必须统计真实 Worker 队列，而不是默认空队列。"""
    health = Path("app/routers/health.py").read_text(encoding="utf-8")
    assert 'RQ_QUEUE_NAMES = ("video:normal", "image:normal", "tool:normal")' in health
    assert 'redis.llen(f"rq:queue:{queue_name}")' in health
    assert "rq:queue:default" not in health
