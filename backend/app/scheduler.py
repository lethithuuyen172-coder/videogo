"""APScheduler 定时任务入口，执行积分和素材巡检。"""

import asyncio

from apscheduler.schedulers.blocking import BlockingScheduler

from app.core.database import get_pool


async def scan_negative_credits() -> None:
    """巡检负余额，正常情况下数据库 CHECK 会阻止该状态。"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetch("SELECT id FROM public.users WHERE credit_balance < 0")


def main() -> None:
    """启动定时任务进程。"""
    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(lambda: asyncio.run(scan_negative_credits()), "interval", minutes=5)
    scheduler.start()


if __name__ == "__main__":
    main()
