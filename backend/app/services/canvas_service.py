"""画布业务逻辑，封装画布与元素的数据访问和所有权校验。"""

from uuid import UUID

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.models.canvas import CanvasCreateReq, CanvasElementReq, CanvasUpdateReq


class CanvasService:
    """画布服务，未授权访问统一返回 404。"""

    async def create_canvas(self, user_id: UUID, req: CanvasCreateReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO canvas.canvases (user_id, title, width, height, background_color)
                VALUES ($1,$2,$3,$4,$5) RETURNING *
                """,
                user_id,
                req.title,
                req.width,
                req.height,
                req.background_color,
            )
        return dict(row)

    async def list_canvases(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM canvas.canvases
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                user_id,
            )
        return [dict(row) for row in rows]

    async def get_canvas_with_elements(self, user_id: UUID, canvas_id: UUID) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            canvas_row = await conn.fetchrow(
                """
                SELECT * FROM canvas.canvases
                WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
                """,
                canvas_id,
                user_id,
            )
            if canvas_row is None:
                raise AppError("E004", "画布不存在", 404)
            elements = await conn.fetch(
                """
                SELECT * FROM canvas.canvas_elements
                WHERE canvas_id=$1 AND deleted_at IS NULL
                ORDER BY z_index
                """,
                canvas_id,
            )
        return {"canvas": dict(canvas_row), "elements": [dict(row) for row in elements]}

    async def update_canvas(self, user_id: UUID, canvas_id: UUID, req: CanvasUpdateReq) -> dict:
        """更新画布标题和背景色。"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE canvas.canvases
                SET title=COALESCE($3,title), background_color=COALESCE($4,background_color)
                WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
                RETURNING *
                """,
                canvas_id,
                user_id,
                req.title,
                req.background_color,
            )
        if row is None:
            raise AppError("E004", "画布不存在", 404)
        return dict(row)

    async def delete_canvas(self, user_id: UUID, canvas_id: UUID) -> None:
        """软删除当前用户画布。"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE canvas.canvases SET deleted_at=now(), status='deleted' WHERE id=$1 AND user_id=$2",
                canvas_id,
                user_id,
            )
        if result.endswith("0"):
            raise AppError("E004", "画布不存在", 404)

    async def export_canvas(self, user_id: UUID, canvas_id: UUID) -> dict:
        """导出画布图片，V1.0 返回可替换为真实文件的 mock URL。"""
        await self.get_canvas_with_elements(user_id, canvas_id)
        return {"format": "png", "url": f"mock://canvas-export/{canvas_id}.png"}

    async def add_element(self, user_id: UUID, canvas_id: UUID, req: CanvasElementReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            owner = await conn.fetchval(
                "SELECT user_id FROM canvas.canvases WHERE id=$1 AND deleted_at IS NULL",
                canvas_id,
            )
            if owner != user_id:
                raise AppError("E004", "画布不存在", 404)
            row = await conn.fetchrow(
                """
                INSERT INTO canvas.canvas_elements
                  (user_id, canvas_id, element_type, z_index, x, y, width, height,
                   rotation, locked, visible, props)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING *
                """,
                user_id,
                canvas_id,
                req.element_type,
                req.z_index,
                req.x,
                req.y,
                req.width,
                req.height,
                req.rotation,
                req.locked,
                req.visible,
                req.props,
            )
        return dict(row)

    async def update_element(
        self,
        user_id: UUID,
        canvas_id: UUID,
        element_id: UUID,
        req: CanvasElementReq,
    ) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE canvas.canvas_elements
                SET element_type=$4, z_index=$5, x=$6, y=$7, width=$8, height=$9,
                    rotation=$10, locked=$11, visible=$12, props=$13
                WHERE id=$1 AND canvas_id=$2 AND user_id=$3 AND deleted_at IS NULL
                RETURNING *
                """,
                element_id,
                canvas_id,
                user_id,
                req.element_type,
                req.z_index,
                req.x,
                req.y,
                req.width,
                req.height,
                req.rotation,
                req.locked,
                req.visible,
                req.props,
            )
        if row is None:
            raise AppError("E004", "画布元素不存在", 404)
        return dict(row)
