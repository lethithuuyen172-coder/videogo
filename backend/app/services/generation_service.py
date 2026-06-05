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
        return dict(row)

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
        params = VideoGenParams(
            prompt=job["prompt"],
            duration_seconds=job["duration_seconds"],
            aspect_ratio=job["aspect_ratio"],
            resolution=job["resolution"],
        )
        result = await provider_router.generate_video(job["model_id"], params)
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
        return dict(row)

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
                req.prompt,
                req.model_id,
                provider_key,
                req.aspect_ratio,
                req.resolution,
                req.image_format,
                cost,
            )
        return dict(row)

    async def run_image_job(self, user_id: UUID, job_id: UUID) -> dict:
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
        params = ImageGenParams(
            prompt=job["prompt"],
            aspect_ratio=job["aspect_ratio"],
            resolution=job["resolution"],
            image_format=job["image_format"],
        )
        result = await provider_router.generate_image(job["model_id"], params)
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
        return dict(row)

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
        """生成 FABE-S 脚本骨架，真实 LLM 可替换该方法。"""
        points = "、".join(req.selling_points) or "核心卖点突出"
        return {
            "framework": "FABE-S",
            "duration_seconds": req.duration_seconds,
            "language": req.language,
            "script": [
                {"part": "Feature", "text": f"这款{req.product_name}主打{points}。"},
                {"part": "Advantage", "text": "它把复杂步骤压缩成一次简单操作。"},
                {"part": "Benefit", "text": "用户能更快看到效果，减少决策成本。"},
                {"part": "Evidence", "text": "用真实场景展示前后对比和关键细节。"},
                {"part": "Story", "text": "用日常痛点开场，以拥有后的轻松状态收尾。"},
            ],
        }

    async def _get_job(self, table: str, user_id: UUID, job_id: UUID, message: str) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(f"SELECT * FROM {table} WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL", job_id, user_id)
        if row is None:
            raise AppError("E004", message, 404)
        return dict(row)
