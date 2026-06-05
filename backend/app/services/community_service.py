"""社区发现业务逻辑，封装作品、点赞和收藏的数据访问。"""

from uuid import UUID

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.models.community import WorkCreateReq


class CommunityService:
    """社区服务，所有作品查询默认走发布状态和软删除过滤。"""

    async def list_published_works(self, work_type: str | None = None) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM community.community_works
                WHERE status='published' AND deleted_at IS NULL
                  AND ($1::text IS NULL OR work_type=$1)
                ORDER BY created_at DESC LIMIT 50
                """,
                work_type,
            )
        return [dict(row) for row in rows]

    async def create_work(self, user_id: UUID, req: WorkCreateReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO community.community_works
                  (user_id, material_id, canvas_id, work_type, title, description, cover_url)
                VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
                """,
                user_id,
                req.material_id,
                req.canvas_id,
                req.work_type,
                req.title,
                req.description,
                req.cover_url,
            )
        return dict(row)

    async def get_published_work(self, work_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM community.community_works
                WHERE id=$1 AND status='published' AND deleted_at IS NULL
                """,
                work_id,
            )
        if row is None:
            raise AppError("E004", "作品不存在", 404)
        return dict(row)

    async def list_my_works(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM community.community_works
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                user_id,
            )
        return [dict(row) for row in rows]

    async def set_like(self, user_id: UUID, work_id: UUID, enabled: bool) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            if enabled:
                await conn.execute(
                    """
                    INSERT INTO community.community_likes (user_id, work_id)
                    VALUES ($1,$2) ON CONFLICT DO NOTHING
                    """,
                    user_id,
                    work_id,
                )
            else:
                await conn.execute(
                    "DELETE FROM community.community_likes WHERE user_id=$1 AND work_id=$2",
                    user_id,
                    work_id,
                )
            await conn.execute(
                """
                UPDATE community.community_works
                SET like_count=(SELECT count(*) FROM community.community_likes WHERE work_id=$1)
                WHERE id=$1
                """,
                work_id,
            )
        return enabled

    async def set_bookmark(self, user_id: UUID, work_id: UUID, enabled: bool) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            if enabled:
                await conn.execute(
                    """
                    INSERT INTO community.community_bookmarks (user_id, work_id)
                    VALUES ($1,$2) ON CONFLICT DO NOTHING
                    """,
                    user_id,
                    work_id,
                )
            else:
                await conn.execute(
                    "DELETE FROM community.community_bookmarks WHERE user_id=$1 AND work_id=$2",
                    user_id,
                    work_id,
                )
            await conn.execute(
                """
                UPDATE community.community_works
                SET bookmark_count=(
                  SELECT count(*) FROM community.community_bookmarks WHERE work_id=$1
                )
                WHERE id=$1
                """,
                work_id,
            )
        return enabled
