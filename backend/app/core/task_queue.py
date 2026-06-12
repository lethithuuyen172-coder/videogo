"""RQ 任务队列封装，按视频、图片和工具任务分队列入队。"""

from typing import Any

from rq import Queue, Retry

from app.core.redis_client import get_redis


class TaskQueue:
    """统一管理 RQ 队列和任务状态查询。"""

    def __init__(self) -> None:
        self.redis = get_redis()

    def queue(self, name: str) -> Queue:
        """按队列名返回 RQ Queue。"""
        return Queue(name, connection=self.redis)

    def enqueue(self, queue_name: str, func: str, *args: Any, **kwargs: Any) -> str:
        """入队任务并返回 RQ job id。"""
        retry = kwargs.pop("retry", Retry(max=2, interval=[10, 30]))
        job = self.queue(queue_name).enqueue(func, *args, retry=retry, **kwargs)
        return str(job.id)

    def get_queue_status(self, queue_name: str) -> dict[str, int]:
        """返回队列长度，供健康检查和后台展示。"""
        queue = self.queue(queue_name)
        return {"queued": len(queue), "started": len(queue.started_job_registry)}


task_queue = TaskQueue()
