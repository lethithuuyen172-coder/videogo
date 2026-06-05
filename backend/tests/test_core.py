"""不依赖外部服务的核心单元测试。"""

from uuid import uuid4

from app.core.provider_router import provider_router
from app.core.responses import fail, ok
from app.core.security import create_jwt
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
    """产品分析和 FABE-S 脚本骨架返回稳定结构。"""
    service = GenerationService()
    analysis = service.analyze_product(ProductAnalysisReq(material_id=uuid4()))
    script = service.generate_script(ScriptGenerateReq(product_name="测试产品"))
    assert analysis["kol_persona"]["style"]
    assert script["framework"] == "FABE-S"
    assert len(script["script"]) == 5


def test_create_jwt_returns_token() -> None:
    """JWT 签发返回可传输字符串。"""
    token = create_jwt(str(uuid4()), "access", {"role": "user"})
    assert isinstance(token, str)
    assert token.count(".") == 2
