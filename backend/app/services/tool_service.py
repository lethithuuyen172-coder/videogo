"""工具箱业务逻辑，封装工具状态、任务创建和查询。"""

from uuid import UUID

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.core.task_queue import task_queue
from app.services.event_service import event_service

TOOLS = [
    {"tool_key": "enhance", "name": "画质增强", "status": "available", "credit_cost": 30},
    {"tool_key": "subtitle-erase", "name": "字幕擦除", "status": "coming_soon", "credit_cost": 0},
    {"tool_key": "watermark-remove", "name": "去水印", "status": "coming_soon", "credit_cost": 0},
    {"tool_key": "viral-remix", "name": "爆款裂变", "status": "coming_soon", "credit_cost": 0},
    {"tool_key": "prompt-reverse", "name": "反推提示词", "status": "coming_soon", "credit_cost": 0},
    {"tool_key": "video-prompt", "name": "视频提示词", "status": "coming_soon", "credit_cost": 0},
]


class ToolService:
    """工具箱服务，V1.0 仅画质增强可创建任务。"""

    def list_tools(self) -> list[dict]:
        return TOOLS

    def enhance_presets(self) -> dict:
        return {"resolutions": ["2K", "4K"], "fps": [30, 60], "denoise": ["low", "medium", "high"]}

    async def list_tasks(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM video.video_processing_jobs
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 100
                """,
                user_id,
            )
        return [dict(row) for row in rows]

    async def create_task(self, user_id: UUID, tool_key: str, payload: dict) -> dict:
        tool = next((item for item in TOOLS if item["tool_key"] == tool_key), None)
        if tool is None:
            raise AppError("E004", "工具不存在", 404)
        if tool["status"] != "available":
            raise AppError("E201", "功能即将上线", 501)

        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO video.video_processing_jobs
                  (user_id, tool_key, input_material_id, params, credit_cost)
                VALUES ($1,$2,$3,$4,$5) RETURNING *
                """,
                user_id,
                tool_key,
                UUID(payload["input_material_id"]) if payload.get("input_material_id") else None,
                payload,
                tool["credit_cost"],
            )
        data = dict(row)
        await event_service.log_task_event(
            "tool",
            data["id"],
            "queued",
            {"tool_key": data["tool_key"], "progress": data["progress"]},
        )
        rq_job_id = task_queue.enqueue(
            "tool:normal",
            "app.worker.tool_worker.process_tool_task",
            str(data["id"]),
        )
        data["rq_job_id"] = rq_job_id
        return data

    async def get_task(self, user_id: UUID, task_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM video.video_processing_jobs
                WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
                """,
                task_id,
                user_id,
            )
        if row is None:
            raise AppError("E004", "工具任务不存在", 404)
        return dict(row)
