"""工具箱 Worker，将画质增强任务标记为完成并生成本地输出占位。"""

import asyncio
from pathlib import Path
from uuid import UUID

from app.config import get_settings
from app.core.database import get_pool


async def _process_tool_task(task_id: UUID) -> dict:
    output_url = _ensure_tool_output(task_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE video.video_processing_jobs
            SET status='succeeded', progress=100, output_url=COALESCE(output_url, $2)
            WHERE id=$1
            RETURNING id, status, progress, output_url
            """,
            task_id,
            output_url,
        )
    return dict(row) if row else {"id": str(task_id), "status": "missing"}


def _ensure_tool_output(task_id: UUID) -> str:
    """写入一个可访问的本地工具输出文件，避免返回不可预览的 mock URL。"""
    settings = get_settings()
    output_dir = Path(settings.local_storage_path) / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"tool-enhance-{task_id}.txt"
    (output_dir / filename).write_text("enhance task completed\n", encoding="utf-8")
    return f"{settings.public_base_url}/storage/generated/{filename}"


def process_tool_task(task_id: str) -> dict:
    """RQ 同步入口，执行工具任务。"""
    return asyncio.run(_process_tool_task(UUID(task_id)))
