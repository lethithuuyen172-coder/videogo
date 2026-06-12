"""Best-effort task and material usage event recording."""

from typing import Any
from uuid import UUID

import structlog

from app.core.database import get_pool

logger = structlog.get_logger(__name__)


class EventService:
    """Write analytics events without blocking the primary task flow."""

    async def log_task_event(
        self,
        task_type: str,
        task_id: UUID,
        event: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO public.task_events (task_type, task_id, event, payload)
                    VALUES ($1, $2, $3, $4)
                    """,
                    task_type,
                    task_id,
                    event,
                    payload or {},
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "task_event_write_failed",
                task_type=task_type,
                task_id=str(task_id),
                task_event=event,
                error=str(exc),
            )

    async def log_material_usage_event(
        self,
        user_id: UUID,
        material_id: UUID,
        action: str,
        target_type: str | None = None,
        target_id: UUID | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO public.material_usage_events
                      (user_id, material_id, action, target_type, target_id, payload)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    user_id,
                    material_id,
                    action,
                    target_type,
                    target_id,
                    payload or {},
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "material_usage_event_write_failed",
                user_id=str(user_id),
                material_id=str(material_id),
                action=action,
                error=str(exc),
            )


event_service = EventService()
