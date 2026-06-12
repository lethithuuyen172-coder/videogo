"""Worker failure finalization and idempotent credit refunds."""

from uuid import UUID

from rq import get_current_job

from app.core.database import transaction
from app.services.event_service import event_service

TASK_TABLES = {
    "video": "video.video_generation_jobs",
    "image": "image.image_generation_jobs",
    "tool": "video.video_processing_jobs",
}


def should_finalize_worker_failure() -> bool:
    """Only finalize inside RQ when no retries remain; direct runs finalize immediately."""
    job = get_current_job()
    if job is None:
        return True
    return int(getattr(job, "retries_left", 0) or 0) <= 0


class WorkerFailureService:
    """Mark failed tasks and refund their credit cost exactly once."""

    async def finalize_failure(
        self,
        task_type: str,
        task_id: UUID,
        error_message: str,
        user_id: UUID | None = None,
    ) -> dict | None:
        table = TASK_TABLES[task_type]
        async with transaction() as conn:
            if user_id is None:
                row = await conn.fetchrow(
                    f"""
                    UPDATE {table}
                    SET status='failed', error_message=$2, progress=100
                    WHERE id=$1 AND deleted_at IS NULL
                    RETURNING id, user_id, credit_cost, status, error_message
                    """,  # nosec B608
                    task_id,
                    error_message[:500],
                )
            else:
                row = await conn.fetchrow(
                    f"""
                    UPDATE {table}
                    SET status='failed', error_message=$3, progress=100
                    WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
                    RETURNING id, user_id, credit_cost, status, error_message
                    """,  # nosec B608
                    task_id,
                    user_id,
                    error_message[:500],
                )
            if row is None:
                return None
            data = dict(row)
            amount = int(data.get("credit_cost") or 0)
            owner_id = data.get("user_id")
            if amount > 0 and owner_id is not None:
                idempotency_key = f"refund:{task_type}:{task_id}"
                existing = await conn.fetchrow(
                    "SELECT id FROM public.credit_records WHERE idempotency_key=$1",
                    idempotency_key,
                )
                if existing is None:
                    balance = await conn.fetchrow(
                        """
                        UPDATE public.users
                        SET credit_balance = credit_balance + $2
                        WHERE id=$1
                        RETURNING credit_balance
                        """,
                        owner_id,
                        amount,
                    )
                    await conn.fetchrow(
                        """
                        INSERT INTO public.credit_records
                          (user_id, task_id, record_type, amount, balance_after, description, idempotency_key)
                        VALUES ($1, $2, 'refund', $3, $4, $5, $6)
                        RETURNING id
                        """,
                        owner_id,
                        f"{task_type}:{task_id}",
                        amount,
                        balance["credit_balance"] if balance else None,
                        f"{task_type} task failed refund",
                        idempotency_key,
                    )
        await event_service.log_task_event(
            task_type,
            task_id,
            "failed",
            {"error_message": error_message[:500], "refunded": True},
        )
        return data


worker_failure_service = WorkerFailureService()
