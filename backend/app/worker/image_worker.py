"""图片生成 Worker，负责从队列执行图片任务。"""

import asyncio
from uuid import UUID

from app.services.generation_service import GenerationService


def process_image_job(user_id: str, job_id: str) -> dict:
    """RQ 同步入口，内部运行异步图片任务。"""
    return asyncio.run(GenerationService().run_image_job(UUID(user_id), UUID(job_id)))
