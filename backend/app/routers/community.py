"""社区发现 API，提供作品展示、发布、点赞和收藏。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.responses import ok
from app.models.community import WorkCreateReq, WorkResp
from app.routers.auth import get_current_user
from app.services.community_service import CommunityService

router = APIRouter(tags=["community"])


def get_community_service() -> CommunityService:
    return CommunityService()


@router.get("/works")
async def list_works(
    request: Request,
    tab: str | None = None,
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """公开瀑布流作品列表，仅返回已发布内容。"""
    works = await service.list_published_works(tab)
    return ok([WorkResp(**work).model_dump(mode="json") for work in works], request)


@router.post("/works")
async def create_work(
    req: WorkCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """发布作品，先进入审核状态。"""
    work = await service.create_work(current_user["id"], req)
    return ok(WorkResp(**work).model_dump(mode="json"), request)


@router.get("/works/{work_id}")
async def get_work(
    work_id: UUID,
    request: Request,
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """查看作品详情。"""
    work = await service.get_published_work(work_id)
    return ok(WorkResp(**work).model_dump(mode="json"), request)


@router.post("/works/{work_id}/like")
async def like_work(
    work_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """点赞作品，重复点赞保持幂等。"""
    await service.set_like(current_user["id"], work_id, True)
    return ok({"liked": True}, request)


@router.post("/works/{work_id}/bookmark")
async def bookmark_work(
    work_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """收藏作品，重复收藏保持幂等。"""
    await service.set_bookmark(current_user["id"], work_id, True)
    return ok({"bookmarked": True}, request)


@router.get("/my/works")
async def my_works(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """查询当前用户发布的作品。"""
    works = await service.list_my_works(current_user["id"])
    return ok([WorkResp(**work).model_dump(mode="json") for work in works], request)


@router.delete("/works/{work_id}/like")
async def unlike_work(
    work_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """取消点赞。"""
    await service.set_like(current_user["id"], work_id, False)
    return ok({"liked": False}, request)


@router.delete("/works/{work_id}/bookmark")
async def unbookmark_work(
    work_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
) -> dict:
    """取消收藏。"""
    await service.set_bookmark(current_user["id"], work_id, False)
    return ok({"bookmarked": False}, request)
