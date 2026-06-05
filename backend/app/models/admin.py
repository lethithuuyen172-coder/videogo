"""管理后台模型。"""

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """管理后台统计指标。"""

    users: int
    materials: int
    video_jobs: int
    image_jobs: int
    pending_reviews: int


class ModerateWorkReq(BaseModel):
    """审核社区作品请求。"""

    status: str = Field(pattern="^(published|rejected|taken_down)$")
    reason: str | None = None


class AdjustCreditsReq(BaseModel):
    """管理员手动调积分请求。"""

    user_id: str
    amount: int
    description: str = "管理员调整"
