"""积分系统请求和响应模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CreditBalanceResp(BaseModel):
    """积分余额响应。"""

    credit_balance: int
    frozen_credits: int
    available_credits: int


class CreditRecordItem(BaseModel):
    """积分流水项。"""

    id: UUID
    record_type: str
    amount: int
    balance_after: int | None
    description: str | None
    created_at: datetime


class RechargeOrderReq(BaseModel):
    """创建充值订单请求。"""

    credits: int = Field(gt=0, le=50000)
    currency: str = "cny"


class RechargeOrderResp(BaseModel):
    """充值订单响应。"""

    id: UUID
    out_trade_no: str
    credits: int
    amount_cents: int
    currency: str
    status: str
    checkout_url: str | None = None


class CreditEstimateReq(BaseModel):
    """积分预估请求，按模块和参数估算。"""

    task_type: Literal["video", "image", "tool"]
    model_id: str = "mock-video"
    duration_seconds: int = Field(default=15, ge=1, le=120)
    resolution: str = "1024"
    tool_key: str | None = None


class CreditEstimateResp(BaseModel):
    """积分预估响应。"""

    estimated_credits: int
    task_type: str
    model_id: str


class CreditDeductReq(BaseModel):
    """内部或测试扣减请求，使用 task_id 保证幂等。"""

    task_id: str = Field(min_length=1, max_length=128)
    amount: int = Field(gt=0)
    description: str | None = None
