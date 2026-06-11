"""AI 图片生成 API，提供 mock 端到端和模型骨架。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.provider_router import provider_router
from app.core.responses import ok
from app.models.generation import ImageCreateReq, JobResp
from app.routers.auth import get_current_user
from app.services.generation_service import GenerationService

router = APIRouter(tags=["images"])


def get_generation_service() -> GenerationService:
    return GenerationService()


@router.get("/models")
async def models(request: Request) -> dict:
    """列出可用图片模型。"""
    items = [m.model_dump() for m in provider_router.list_models() if m.modality == "image"]
    if request.headers.get("x-openai-api-key"):
        for item in items:
            if item["model_id"] == "dalle-3":
                item["status"] = "configured"
    return ok(items, request)


@router.get("/styles")
async def styles(request: Request) -> dict:
    """列出图片风格预设。"""
    return ok(
        [
            {"style_key": "commerce", "name": "电商主图", "prompt_suffix": "clean product lighting"},
            {"style_key": "lifestyle", "name": "生活方式", "prompt_suffix": "natural lifestyle scene"},
            {"style_key": "poster", "name": "广告海报", "prompt_suffix": "bold commercial poster"},
        ],
        request,
    )


@router.post("")
async def create_image(
    req: ImageCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """创建图片生成任务。"""
    job = await service.create_image_job(current_user["id"], req)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.get("")
async def list_images(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """查询图片任务列表。"""
    jobs = await service.list_image_jobs(current_user["id"])
    return ok([JobResp(**job).model_dump(mode="json") for job in jobs], request)


@router.get("/{job_id}")
async def get_image(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """查询图片任务详情。"""
    job = await service.get_image_job(current_user["id"], job_id)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.post("/{job_id}/run-now")
async def run_image_now(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """同步运行 mock 图片任务，便于本地验收。"""
    openai_api_key = request.headers.get("x-openai-api-key")
    job = await service.run_image_job(current_user["id"], job_id, openai_api_key)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.post("/{job_id}/enqueue")
async def enqueue_image(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """将图片任务投入 RQ 队列，由 Worker 异步执行。"""
    return ok(await service.enqueue_image_job(current_user["id"], job_id), request)


@router.post("/estimate")
async def estimate_image(req: ImageCreateReq, request: Request) -> dict:
    """估算图片生成积分。"""
    cost = provider_router.estimate_image_cost(req.model_id, req.resolution)
    return ok({"estimated_credits": cost, "model_id": req.model_id}, request)
