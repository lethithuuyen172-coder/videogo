"""画布 API，支持新建画布、元素 CRUD 和保存基础编辑状态。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.responses import ok
from app.models.canvas import (
    CanvasCreateReq,
    CanvasElementReq,
    CanvasElementResp,
    CanvasResp,
    CanvasUpdateReq,
)
from app.routers.auth import get_current_user
from app.services.canvas_service import CanvasService

router = APIRouter(tags=["canvases"])


def get_canvas_service() -> CanvasService:
    return CanvasService()


@router.post("")
async def create_canvas(
    req: CanvasCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """创建空白画布。"""
    canvas = await service.create_canvas(current_user["id"], req)
    return ok(CanvasResp(**canvas).model_dump(mode="json"), request)


@router.get("")
async def list_canvases(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """查询我的画布列表。"""
    canvases = await service.list_canvases(current_user["id"])
    return ok([CanvasResp(**canvas).model_dump(mode="json") for canvas in canvases], request)


@router.get("/{canvas_id}")
async def get_canvas(
    canvas_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """查询画布及元素。"""
    data = await service.get_canvas_with_elements(current_user["id"], canvas_id)
    return ok(
        {
            "canvas": CanvasResp(**data["canvas"]).model_dump(mode="json"),
            "elements": [
                CanvasElementResp(**element).model_dump(mode="json")
                for element in data["elements"]
            ],
        },
        request,
    )


@router.put("/{canvas_id}")
async def update_canvas(
    canvas_id: UUID,
    req: CanvasUpdateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """更新画布基础信息。"""
    canvas = await service.update_canvas(current_user["id"], canvas_id, req)
    return ok(CanvasResp(**canvas).model_dump(mode="json"), request)


@router.delete("/{canvas_id}")
async def delete_canvas(
    canvas_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """软删除画布。"""
    await service.delete_canvas(current_user["id"], canvas_id)
    return ok({"deleted": True}, request)


@router.post("/{canvas_id}/export")
async def export_canvas(
    canvas_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """导出画布为图片。"""
    return ok(await service.export_canvas(current_user["id"], canvas_id), request)


@router.post("/{canvas_id}/elements")
async def add_element(
    canvas_id: UUID,
    req: CanvasElementReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """向画布添加元素。"""
    element = await service.add_element(current_user["id"], canvas_id, req)
    return ok(CanvasElementResp(**element).model_dump(mode="json"), request)


@router.put("/{canvas_id}/elements/{element_id}")
async def update_element(
    canvas_id: UUID,
    element_id: UUID,
    req: CanvasElementReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> dict:
    """更新画布元素。"""
    element = await service.update_element(current_user["id"], canvas_id, element_id, req)
    return ok(CanvasElementResp(**element).model_dump(mode="json"), request)
