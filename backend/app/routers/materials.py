"""素材管理 API 路由，覆盖上传、列表、详情、更新、删除和引用链。"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.core.responses import ok
from app.models.materials import (
    MaterialDispatchReq,
    MaterialReferenceResp,
    MaterialResp,
    MaterialUpdateReq,
)
from app.routers.auth import get_current_user
from app.services.material_service import MaterialService

router = APIRouter(tags=["materials"])


def get_material_service() -> MaterialService:
    return MaterialService()


@router.post("")
async def upload_material(
    request: Request,
    file: UploadFile = File(...),
    tags: str = Form(default=""),
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """上传素材并写入元数据。"""
    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    material = await service.upload(current_user["id"], file, tag_list)
    return ok(MaterialResp(**material).model_dump(mode="json"), request)


@router.get("")
async def list_materials(
    request: Request,
    material_type: str | None = None,
    is_subject: bool | None = None,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """查询当前用户素材列表。"""
    items = await service.list_materials(current_user["id"], material_type, is_subject)
    return ok([MaterialResp(**item).model_dump(mode="json") for item in items], request)


@router.get("/{material_id}")
async def get_material(
    material_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """查询素材详情。"""
    material = await service.get(current_user["id"], material_id)
    return ok(MaterialResp(**material).model_dump(mode="json"), request)


@router.put("/{material_id}")
@router.patch("/{material_id}")
async def update_material(
    material_id: UUID,
    req: MaterialUpdateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """更新素材标题和标签。"""
    material = await service.update(current_user["id"], material_id, req)
    return ok(MaterialResp(**material).model_dump(mode="json"), request)


@router.delete("/{material_id}")
async def delete_material(
    material_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """软删除素材。"""
    await service.delete(current_user["id"], material_id)
    return ok({"deleted": True}, request)


@router.get("/{material_id}/references")
async def material_references(
    material_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """查询素材引用链。"""
    refs = await service.references(current_user["id"], material_id)
    return ok([MaterialReferenceResp(**ref).model_dump(mode="json") for ref in refs], request)


@router.post("/{material_id}/dispatch")
async def dispatch_material(
    material_id: UUID,
    req: MaterialDispatchReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """记录素材派发到生成器、画布或工具的复用事件。"""
    return ok(await service.dispatch(current_user["id"], material_id, req), request)


@router.post("/upload-url")
@router.post("/presigned-upload-url")
async def presigned_upload_url(request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    """返回预签名上传 URL 骨架，本地开发仍走直传接口。"""
    return ok({"upload_url": None, "mode": "direct", "user_id": str(current_user["id"])}, request)


@router.post("/batch-delete")
async def batch_delete_materials(
    payload: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: MaterialService = Depends(get_material_service),
) -> dict:
    """批量软删除素材。"""
    deleted: list[str] = []
    for raw_id in payload.get("ids", []):
        await service.delete(current_user["id"], UUID(raw_id))
        deleted.append(raw_id)
    return ok({"deleted": deleted}, request)
