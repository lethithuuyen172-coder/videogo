"""工具箱 API，画质增强可运行骨架，其余工具返回即将上线。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.exceptions import AppError
from app.core.responses import ok
from app.routers.auth import get_current_user
from app.services.tool_service import ToolService

router = APIRouter(tags=["tools"])


def get_tool_service() -> ToolService:
    return ToolService()


@router.get("")
async def list_tools(
    request: Request,
    service: ToolService = Depends(get_tool_service),
) -> dict:
    """列出工具箱能力和上线状态。"""
    return ok(service.list_tools(), request)


@router.post("/{tool_key}/tasks")
async def create_tool_task(
    tool_key: str,
    payload: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ToolService = Depends(get_tool_service),
) -> dict:
    """创建工具任务，V1.0 仅画质增强进入队列。"""
    row = await service.create_task(current_user["id"], tool_key, payload)
    return ok(
        {
            "id": str(row["id"]),
            "status": row["status"],
            "credit_cost": row["credit_cost"],
            "rq_job_id": row["rq_job_id"],
        },
        request,
    )


@router.get("/tasks")
async def list_tool_tasks(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ToolService = Depends(get_tool_service),
) -> dict:
    """查询当前用户工具任务列表。"""
    rows = await service.list_tasks(current_user["id"])
    return ok(
        [
            {
                "id": str(row["id"]),
                "tool_key": row["tool_key"],
                "status": row["status"],
                "progress": row["progress"],
                "credit_cost": row["credit_cost"],
                "output_url": row["output_url"],
                "error_code": row["error_code"],
                "error_message": row["error_message"],
                "created_at": row["created_at"].isoformat(),
            }
            for row in rows
        ],
        request,
    )


@router.get("/tasks/{task_id}")
async def get_tool_task(
    task_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ToolService = Depends(get_tool_service),
) -> dict:
    """查询工具任务状态。"""
    row = await service.get_task(current_user["id"], task_id)
    return ok({"id": str(row["id"]), "status": row["status"], "progress": row["progress"], "output_url": row["output_url"]}, request)


@router.get("/enhance/presets")
async def enhance_presets(
    request: Request,
    service: ToolService = Depends(get_tool_service),
) -> dict:
    """画质增强参数预设。"""
    return ok(service.enhance_presets(), request)


@router.post("/subtitle-erase/tasks")
async def subtitle_erase_task(request: Request) -> dict:
    """字幕擦除任务骨架。"""
    raise AppError("E201", "字幕擦除功能即将上线", 501)


@router.post("/watermark-remove/tasks")
async def watermark_remove_task(request: Request) -> dict:
    """去水印任务骨架，默认限制使用。"""
    raise AppError("E201", "去水印功能受合规限制，暂未开放", 501)


@router.post("/prompt-reverse/tasks")
async def prompt_reverse_task(request: Request) -> dict:
    """反推提示词任务骨架。"""
    raise AppError("E201", "反推提示词功能即将上线", 501)


@router.post("/video-prompt/tasks")
async def video_prompt_task(request: Request) -> dict:
    """视频提示词任务骨架。"""
    raise AppError("E201", "视频提示词功能即将上线", 501)
