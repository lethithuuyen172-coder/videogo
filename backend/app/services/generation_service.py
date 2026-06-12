"""视频、图片、产品分析和 FABE-S 脚本生成业务逻辑。"""

from uuid import UUID

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.core.provider_base import ImageGenParams, VideoGenParams
from app.core.provider_router import provider_router
from app.core.task_queue import task_queue
from app.models.generation import (
    ImageCreateReq,
    ProductAnalysisReq,
    ScriptGenerateReq,
    VideoCreateReq,
)
from app.services.event_service import event_service
from app.services.script_skill_library import build_shoppable_video_script, list_script_templates
from app.services.worker_failure_service import (
    should_finalize_worker_failure,
    worker_failure_service,
)


class GenerationService:
    """创作流水线服务，V1.0 以 mock 端到端为主要验收路径。"""

    async def create_video_job(self, user_id: UUID, req: VideoCreateReq) -> dict:
        cost = provider_router.estimate_video_cost(req.model_id, req.duration_seconds)
        provider_key = provider_router.video_providers[req.model_id].provider_key
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO video.video_generation_jobs
                  (user_id, material_id, prompt, model_id, provider_key, duration_seconds, aspect_ratio, resolution, credit_cost)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *
                """,
                user_id,
                req.material_id,
                req.prompt,
                req.model_id,
                provider_key,
                req.duration_seconds,
                req.aspect_ratio,
                req.resolution,
                cost,
            )
        data = dict(row)
        await event_service.log_task_event(
            "video",
            data["id"],
            "queued",
            {"model_id": data["model_id"], "provider_key": data["provider_key"], "progress": data["progress"]},
        )
        return data

    async def run_video_job(self, user_id: UUID, job_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            job = await conn.fetchrow(
                "SELECT * FROM video.video_generation_jobs WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
                job_id,
                user_id,
            )
            if job is None:
                raise AppError("E004", "视频任务不存在", 404)
            await conn.execute("UPDATE video.video_generation_jobs SET status='processing', progress=10 WHERE id=$1", job_id)
        await event_service.log_task_event("video", job_id, "processing", {"progress": 10})
        params = VideoGenParams(
            prompt=job["prompt"],
            duration_seconds=job["duration_seconds"],
            aspect_ratio=job["aspect_ratio"],
            resolution=job["resolution"],
        )
        try:
            result = await provider_router.generate_video(job["model_id"], params)
        except Exception as exc:
            if should_finalize_worker_failure():
                await worker_failure_service.finalize_failure("video", job_id, str(exc), user_id)
            raise
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE video.video_generation_jobs
                SET status='succeeded', progress=100, output_url=$3
                WHERE id=$1 AND user_id=$2
                RETURNING *
                """,
                job_id,
                user_id,
                result.url,
            )
        data = dict(row)
        await event_service.log_task_event(
            "video",
            job_id,
            "succeeded",
            {"progress": data["progress"], "output_url": data["output_url"]},
        )
        return data

    async def list_video_jobs(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM video.video_generation_jobs WHERE user_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50",
                user_id,
            )
        return [dict(row) for row in rows]

    async def get_video_job(self, user_id: UUID, job_id: UUID) -> dict:
        return await self._get_job("video.video_generation_jobs", user_id, job_id, "视频任务不存在")

    async def enqueue_video_job(self, user_id: UUID, job_id: UUID) -> dict:
        """将视频任务投入 RQ 队列，保持 queued 状态等待 Worker 执行。"""
        job = await self.get_video_job(user_id, job_id)
        rq_job_id = task_queue.enqueue(
            "video:normal",
            "app.worker.video_worker.process_video_job",
            str(user_id),
            str(job_id),
        )
        return {"job_id": str(job["id"]), "rq_job_id": rq_job_id, "status": job["status"]}

    async def create_image_job(self, user_id: UUID, req: ImageCreateReq) -> dict:
        cost = provider_router.estimate_image_cost(req.model_id, req.resolution)
        provider_key = provider_router.image_providers[req.model_id].provider_key
        prompt = self._apply_image_style(req.prompt, req.style_key)
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO image.image_generation_jobs
                  (user_id, material_id, prompt, model_id, provider_key, aspect_ratio, resolution, image_format, credit_cost)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *
                """,
                user_id,
                req.material_id,
                prompt,
                req.model_id,
                provider_key,
                req.aspect_ratio,
                req.resolution,
                req.image_format,
                cost,
            )
        data = dict(row)
        await event_service.log_task_event(
            "image",
            data["id"],
            "queued",
            {"model_id": data["model_id"], "provider_key": data["provider_key"], "progress": data["progress"]},
        )
        return data

    async def run_image_job(self, user_id: UUID, job_id: UUID, openai_api_key: str | None = None) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            job = await conn.fetchrow(
                "SELECT * FROM image.image_generation_jobs WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
                job_id,
                user_id,
            )
            if job is None:
                raise AppError("E004", "图片任务不存在", 404)
            await conn.execute("UPDATE image.image_generation_jobs SET status='processing', progress=10 WHERE id=$1", job_id)
        await event_service.log_task_event("image", job_id, "processing", {"progress": 10})
        params = ImageGenParams(
            prompt=job["prompt"],
            aspect_ratio=job["aspect_ratio"],
            resolution=job["resolution"],
            image_format=job["image_format"],
            openai_api_key=openai_api_key,
        )
        try:
            result = await provider_router.generate_image(job["model_id"], params)
        except Exception as exc:
            if should_finalize_worker_failure():
                await worker_failure_service.finalize_failure("image", job_id, str(exc), user_id)
            raise
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE image.image_generation_jobs
                SET status='succeeded', progress=100, output_url=$3
                WHERE id=$1 AND user_id=$2
                RETURNING *
                """,
                job_id,
                user_id,
                result.url,
            )
        data = dict(row)
        await event_service.log_task_event(
            "image",
            job_id,
            "succeeded",
            {"progress": data["progress"], "output_url": data["output_url"]},
        )
        return data

    async def list_image_jobs(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM image.image_generation_jobs WHERE user_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50",
                user_id,
            )
        return [dict(row) for row in rows]

    async def get_image_job(self, user_id: UUID, job_id: UUID) -> dict:
        return await self._get_job("image.image_generation_jobs", user_id, job_id, "图片任务不存在")

    async def enqueue_image_job(self, user_id: UUID, job_id: UUID) -> dict:
        """将图片任务投入 RQ 队列，保持 queued 状态等待 Worker 执行。"""
        job = await self.get_image_job(user_id, job_id)
        rq_job_id = task_queue.enqueue(
            "image:normal",
            "app.worker.image_worker.process_image_job",
            str(user_id),
            str(job_id),
        )
        return {"job_id": str(job["id"]), "rq_job_id": rq_job_id, "status": job["status"]}

    def analyze_product(self, req: ProductAnalysisReq) -> dict:
        """Mock 产品分析，保持字段贴合 PRD 的达人画像和感官卖点。"""
        return {
            "material_id": str(req.material_id),
            "language": req.language,
            "category": "智能消费品",
            "sensory_selling_points": ["高颜值外观", "即开即用", "适合短视频展示"],
            "hidden_audience": "追求效率和新鲜感的社交电商消费者",
            "kol_persona": {"style": "真实测评型达人", "tone": "克制、可信、转化导向"},
        }

    def generate_script(self, req: ScriptGenerateReq) -> dict:
        """按内置 108 个带货视频 Skill 目录生成脚本、分镜和视频 Prompt。"""
        return build_shoppable_video_script(req)

    def list_script_templates(self) -> list[dict]:
        """列出可用于视频脚本生成的 TikTok/抖音模板。"""
        return list_script_templates()

    async def _get_job(self, table: str, user_id: UUID, job_id: UUID, message: str) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(f"SELECT * FROM {table} WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL", job_id, user_id)  # nosec B608
        if row is None:
            raise AppError("E004", message, 404)
        return dict(row)

    @staticmethod
    def _apply_image_style(prompt: str, style_key: str | None) -> str:
        """将图片风格预设转成稳定的提示词后缀。"""
        suffixes = {
            "commerce": "clean product lighting",
            "lifestyle": "natural lifestyle scene",
            "poster": "bold commercial poster",
        }
        suffix = suffixes.get(style_key or "")
        return f"{prompt}, {suffix}" if suffix else prompt
