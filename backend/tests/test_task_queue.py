"""任务队列契约测试，不依赖真实 Redis。"""

from app.core.task_queue import TaskQueue
from app.main import app


class FakeQueue:
    """模拟 RQ Queue，验证入队参数被正确传递。"""

    def __init__(self) -> None:
        self.started_job_registry: list[str] = []
        self.enqueued: tuple | None = None

    def enqueue(self, func: str, *args, **kwargs):
        self.enqueued = (func, args, kwargs)
        return type("FakeJob", (), {"id": "rq_job_test"})()

    def __len__(self) -> int:
        return 1


def test_task_queue_enqueue_accepts_import_path(monkeypatch) -> None:
    """队列封装应支持 import path 字符串，避免 Worker 和 Service 循环导入。"""
    queue = FakeQueue()
    task_queue = TaskQueue()
    monkeypatch.setattr(task_queue, "queue", lambda _: queue)

    job_id = task_queue.enqueue("video:normal", "app.worker.video_worker.process_video_job", "u1", "j1")

    assert job_id == "rq_job_test"
    assert queue.enqueued == ("app.worker.video_worker.process_video_job", ("u1", "j1"), {})


def test_openapi_exposes_enqueue_endpoints() -> None:
    """视频和图片任务必须提供异步入队接口。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/videos/{job_id}/enqueue" in paths
    assert "/api/v1/images/{job_id}/enqueue" in paths
