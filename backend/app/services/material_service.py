"""素材上传、查询、软删除和引用链业务逻辑。"""

from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.core.storage import get_storage
from app.models.materials import MaterialDispatchReq, MaterialUpdateReq
from app.services.event_service import event_service


class MaterialService:
    """素材服务，所有文件名由存储层 UUID 化。"""

    async def upload(self, user_id: UUID, file: UploadFile, tags: list[str] | None = None) -> dict:
        content = await file.read()
        if len(content) > 200 * 1024 * 1024:
            raise AppError("E010", "文件大小超限", 413)
        content_type = file.content_type or "application/octet-stream"
        material_type = self._type_from_mime(content_type)
        suffix = Path(file.filename or "").suffix or self._suffix_from_mime(content_type)
        stored = await get_storage().upload(content, content_type, suffix)
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO public.materials
                  (user_id, material_type, source, title, storage_key, url, mime_type, size_bytes, tags)
                VALUES ($1, $2, 'upload', $3, $4, $5, $6, $7, $8)
                RETURNING *
                """,
                user_id,
                material_type,
                file.filename or stored.key,
                stored.key,
                stored.url,
                content_type,
                stored.size_bytes,
                tags or [],
            )
        return dict(row)

    async def list_materials(
        self,
        user_id: UUID,
        material_type: str | None = None,
        is_subject: bool | None = None,
    ) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM public.materials
                WHERE user_id=$1 AND deleted_at IS NULL
                  AND ($2::text IS NULL OR material_type=$2)
                  AND ($3::boolean IS NULL OR is_subject=$3)
                ORDER BY created_at DESC
                LIMIT 100
                """,
                user_id,
                material_type,
                is_subject,
            )
        return [dict(row) for row in rows]

    async def get(self, user_id: UUID, material_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM public.materials WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
                material_id,
                user_id,
            )
        if row is None:
            raise AppError("E004", "素材不存在", 404)
        return dict(row)

    async def update(self, user_id: UUID, material_id: UUID, req: MaterialUpdateReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE public.materials
                SET title=COALESCE($3, title), tags=COALESCE($4, tags), is_subject=COALESCE($5, is_subject)
                WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
                RETURNING *
                """,
                material_id,
                user_id,
                req.title,
                req.tags,
                req.is_subject,
            )
        if row is None:
            raise AppError("E004", "素材不存在", 404)
        return dict(row)

    async def delete(self, user_id: UUID, material_id: UUID) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE public.materials SET deleted_at=now(), status='deleted' WHERE id=$1 AND user_id=$2",
                material_id,
                user_id,
            )
        if result.endswith("0"):
            raise AppError("E004", "素材不存在", 404)

    async def references(self, user_id: UUID, material_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM public.material_references
                WHERE user_id=$1 AND (source_material_id=$2 OR target_material_id=$2)
                ORDER BY created_at DESC
                """,
                user_id,
                material_id,
            )
        return [dict(row) for row in rows]

    async def dispatch(self, user_id: UUID, material_id: UUID, req: MaterialDispatchReq) -> dict:
        material = await self.get(user_id, material_id)
        await event_service.log_material_usage_event(
            user_id,
            material_id,
            req.action,
            req.target_type,
            req.target_id,
            {
                "target_route": req.target_route,
                "material_type": material["material_type"],
                "title": material["title"],
                "url": material.get("url"),
            },
        )
        return {
            "material_id": str(material_id),
            "target_type": req.target_type,
            "target_route": req.target_route,
            "dispatched": True,
        }

    @staticmethod
    def _type_from_mime(content_type: str) -> str:
        if content_type.startswith("image/"):
            return "image"
        if content_type.startswith("video/"):
            return "video"
        if content_type.startswith("audio/"):
            return "audio"
        if content_type.startswith("text/"):
            return "text"
        raise AppError("E011", "不支持的文件格式", 415)

    @staticmethod
    def _suffix_from_mime(content_type: str) -> str:
        return {"image/png": ".png", "image/jpeg": ".jpg", "video/mp4": ".mp4"}.get(content_type, ".bin")
