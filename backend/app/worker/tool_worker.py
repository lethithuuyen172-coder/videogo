"""工具箱 Worker，V1.0 将画质增强任务标记为完成并保留输出骨架。"""

import asyncio
from uuid import UUID

from app.core.database import get_pool


async def _process_tool_task(task_id: UUID) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE video.video_processing_jobs
            SET status='succeeded', progress=100, output_url=COALESCE(output_url, 'mock://enhanced-output')
            WHERE id=$1
            RETURNING id, status, progress, output_url
            """,
            task_id,
        )
    return dict(row) if row else {"id": str(task_id), "status": "missing"}


def process_tool_task(task_id: str) -> dict:
    """RQ 同步入口，执行工具任务。"""
    return asyncio.run(_process_tool_task(UUID(task_id)))
