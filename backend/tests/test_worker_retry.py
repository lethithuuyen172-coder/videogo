"""Worker retry finalization and idempotent refund tests."""

from uuid import UUID, uuid4

import pytest

from app.services import generation_service as generation_module
from app.services import worker_failure_service as failure_module
from app.services.worker_failure_service import WorkerFailureService, should_finalize_worker_failure


class FakeJob:
    def __init__(self, retries_left: int) -> None:
        self.retries_left = retries_left


class FakeConnection:
    def __init__(self, existing_refund: bool = False) -> None:
        self.existing_refund = existing_refund
        self.fetchrow_calls: list[tuple] = []

    async def fetchrow(self, query: str, *args):
        self.fetchrow_calls.append((query, args))
        if "UPDATE video.video_generation_jobs" in query:
            return {
                "id": args[0],
                "user_id": UUID("00000000-0000-0000-0000-000000000001"),
                "credit_cost": 15,
                "status": "failed",
                "error_message": args[-1],
            }
        if "SELECT id FROM public.credit_records" in query:
            return {"id": uuid4()} if self.existing_refund else None
        if "UPDATE public.users" in query:
            return {"credit_balance": 115}
        if "INSERT INTO public.credit_records" in query:
            return {"id": uuid4()}
        return None


class FakeTransaction:
    def __init__(self, conn: FakeConnection) -> None:
        self.conn = conn

    async def __aenter__(self) -> FakeConnection:
        return self.conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


def test_worker_failure_finalizes_only_when_retries_are_exhausted(monkeypatch) -> None:
    monkeypatch.setattr(failure_module, "get_current_job", lambda: FakeJob(retries_left=1))
    assert should_finalize_worker_failure() is False

    monkeypatch.setattr(failure_module, "get_current_job", lambda: FakeJob(retries_left=0))
    assert should_finalize_worker_failure() is True

    monkeypatch.setattr(failure_module, "get_current_job", lambda: None)
    assert should_finalize_worker_failure() is True


@pytest.mark.asyncio
async def test_finalize_failure_marks_failed_and_refunds_once(monkeypatch) -> None:
    conn = FakeConnection(existing_refund=False)
    event_calls: list[tuple] = []

    class FakeEventService:
        async def log_task_event(self, task_type: str, task_id, event: str, payload=None) -> None:
            event_calls.append((task_type, str(task_id), event, payload))

    monkeypatch.setattr(failure_module, "transaction", lambda: FakeTransaction(conn))
    monkeypatch.setattr(failure_module, "event_service", FakeEventService())
    task_id = uuid4()

    result = await WorkerFailureService().finalize_failure(
        "video",
        task_id,
        "provider failed",
        UUID("00000000-0000-0000-0000-000000000001"),
    )

    assert result is not None
    assert result["status"] == "failed"
    assert any("INSERT INTO public.credit_records" in call[0] for call in conn.fetchrow_calls)
    assert event_calls[-1][2] == "failed"


@pytest.mark.asyncio
async def test_finalize_failure_does_not_double_refund(monkeypatch) -> None:
    conn = FakeConnection(existing_refund=True)

    class FakeEventService:
        async def log_task_event(self, task_type: str, task_id, event: str, payload=None) -> None:
            return None

    monkeypatch.setattr(failure_module, "transaction", lambda: FakeTransaction(conn))
    monkeypatch.setattr(failure_module, "event_service", FakeEventService())

    await WorkerFailureService().finalize_failure("video", uuid4(), "provider failed")

    assert not any("INSERT INTO public.credit_records" in call[0] for call in conn.fetchrow_calls)


@pytest.mark.asyncio
async def test_video_provider_failure_uses_final_failure_service(monkeypatch) -> None:
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    job_id = UUID("00000000-0000-0000-0000-000000000002")
    finalized: list[tuple] = []

    class FakeConnection:
        async def fetchrow(self, query: str, *args):
            if "SELECT * FROM video.video_generation_jobs" in query:
                return {
                    "id": job_id,
                    "prompt": "demo",
                    "duration_seconds": 15,
                    "aspect_ratio": "9:16",
                    "resolution": "720p",
                    "model_id": "mock-video",
                }
            return None

        async def execute(self, *args):
            return "UPDATE 1"

    class FakeAcquire:
        async def __aenter__(self):
            return FakeConnection()

        async def __aexit__(self, exc_type, exc, tb):
            return None

    class FakePool:
        def acquire(self):
            return FakeAcquire()

    class FakeProviderRouter:
        async def generate_video(self, model_id, params):
            raise RuntimeError("provider failed")

    class FakeFailureService:
        async def finalize_failure(self, task_type: str, task_id, error_message: str, owner_id=None):
            finalized.append((task_type, task_id, error_message, owner_id))

    async def fake_get_pool() -> FakePool:
        return FakePool()

    monkeypatch.setattr(generation_module, "get_pool", fake_get_pool)
    monkeypatch.setattr(generation_module, "provider_router", FakeProviderRouter())
    monkeypatch.setattr(generation_module, "should_finalize_worker_failure", lambda: True)
    monkeypatch.setattr(generation_module, "worker_failure_service", FakeFailureService())

    with pytest.raises(RuntimeError, match="provider failed"):
        await generation_module.GenerationService().run_video_job(user_id, job_id)

    assert finalized == [("video", job_id, "provider failed", user_id)]
