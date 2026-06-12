"""Unified task and material event service tests."""

from uuid import uuid4

import pytest

from app.services import event_service as event_module
from app.services.event_service import EventService


class FakeConnection:
    def __init__(self) -> None:
        self.executed: list[tuple] = []

    async def execute(self, *args):
        self.executed.append(args)
        return "INSERT 0 1"


class FakeAcquire:
    def __init__(self, conn: FakeConnection) -> None:
        self.conn = conn

    async def __aenter__(self) -> FakeConnection:
        return self.conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class FakePool:
    def __init__(self, conn: FakeConnection) -> None:
        self.conn = conn

    def acquire(self) -> FakeAcquire:
        return FakeAcquire(self.conn)


@pytest.mark.asyncio
async def test_task_event_is_inserted(monkeypatch) -> None:
    conn = FakeConnection()

    async def fake_get_pool() -> FakePool:
        return FakePool(conn)

    monkeypatch.setattr(event_module, "get_pool", fake_get_pool)
    task_id = uuid4()

    await EventService().log_task_event("video", task_id, "processing", {"progress": 10})

    assert conn.executed
    assert "INSERT INTO public.task_events" in conn.executed[0][0]
    assert conn.executed[0][1:] == ("video", task_id, "processing", {"progress": 10})


@pytest.mark.asyncio
async def test_material_usage_event_is_inserted(monkeypatch) -> None:
    conn = FakeConnection()

    async def fake_get_pool() -> FakePool:
        return FakePool(conn)

    monkeypatch.setattr(event_module, "get_pool", fake_get_pool)
    user_id = uuid4()
    material_id = uuid4()
    target_id = uuid4()

    await EventService().log_material_usage_event(
        user_id,
        material_id,
        "dispatch",
        "image",
        target_id,
        {"source": "assets"},
    )

    assert conn.executed
    assert "INSERT INTO public.material_usage_events" in conn.executed[0][0]
    assert conn.executed[0][1:] == (
        user_id,
        material_id,
        "dispatch",
        "image",
        target_id,
        {"source": "assets"},
    )


@pytest.mark.asyncio
async def test_event_write_failure_is_best_effort(monkeypatch) -> None:
    async def fake_get_pool():
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(event_module, "get_pool", fake_get_pool)

    await EventService().log_task_event("image", uuid4(), "queued")
