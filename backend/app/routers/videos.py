"""AI 视频生成 API，包含产品分析、FABE-S 脚本和 mock 任务闭环。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.provider_router import provider_router
from app.core.responses import ok
from app.models.generation import JobResp, ProductAnalysisReq, ScriptGenerateReq, VideoCreateReq
from app.routers.auth import get_current_user
from app.services.generation_service import GenerationService

router = APIRouter(tags=["videos"])


def get_generation_service() -> GenerationService:
    return GenerationService()


@router.get("/models")
async def models(request: Request) -> dict:
    """列出可用视频模型。"""
    items = [m.model_dump() for m in provider_router.list_models() if m.modality == "video"]
    return ok(items, request)


@router.post("/product-analysis")
@router.post("/analyze-product")
async def analyze_product(req: ProductAnalysisReq, request: Request, service: GenerationService = Depends(get_generation_service)) -> dict:
    """分析产品图并返回带货创作要素。"""
    return ok(service.analyze_product(req), request)


@router.post("/scripts")
async def generate_script(req: ScriptGenerateReq, request: Request, service: GenerationService = Depends(get_generation_service)) -> dict:
    """按 FABE-S 框架生成脚本。"""
    return ok(service.generate_script(req), request)


@router.post("")
async def create_video(
    req: VideoCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """创建视频生成任务。"""
    job = await service.create_video_job(current_user["id"], req)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.get("")
async def list_videos(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """查询视频任务列表。"""
    jobs = await service.list_video_jobs(current_user["id"])
    return ok([JobResp(**job).model_dump(mode="json") for job in jobs], request)


@router.get("/{job_id}")
async def get_video(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """查询视频任务详情。"""
    job = await service.get_video_job(current_user["id"], job_id)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.post("/{job_id}/run-now")
async def run_video_now(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """同步运行 mock 视频任务，便于本地验收。"""
    job = await service.run_video_job(current_user["id"], job_id)
    return ok(JobResp(**job).model_dump(mode="json"), request)


@router.post("/{job_id}/enqueue")
async def enqueue_video(
    job_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
) -> dict:
    """将视频任务投入 RQ 队列，由 Worker 异步执行。"""
    return ok(await service.enqueue_video_job(current_user["id"], job_id), request)
