"""认证模块请求和响应模型。"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterReq(BaseModel):
    """注册请求。"""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=80)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("密码必须包含大写字母")
        if not any(char.islower() for char in value):
            raise ValueError("密码必须包含小写字母")
        if not any(char.isdigit() for char in value):
            raise ValueError("密码必须包含数字")
        return value


class UserLoginReq(BaseModel):
    """登录请求。"""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResp(BaseModel):
    """JWT 登录响应。"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserInfoResp(BaseModel):
    """当前用户信息，敏感字段不返回。"""

    id: UUID
    email: EmailStr
    display_name: str | None
    role: Literal["guest", "user", "enterprise", "admin", "moderator"]
    status: str
    credit_balance: int
    frozen_credits: int
    created_at: datetime


class RefreshTokenReq(BaseModel):
    """刷新 access token 请求。"""

    refresh_token: str


class VerifyEmailReq(BaseModel):
    """邮箱验证确认请求。"""

    token: str


class ForgotPasswordReq(BaseModel):
    """密码重置请求。"""

    email: EmailStr


class ResetPasswordReq(BaseModel):
    """密码重置确认请求。"""

    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return UserRegisterReq.strong_password(value)


class ChangePasswordReq(BaseModel):
    """登录态修改密码请求。"""

    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return UserRegisterReq.strong_password(value)


class APIKeyCreateReq(BaseModel):
    """创建 API Key 请求。"""

    name: str = Field(min_length=1, max_length=80)


class APIKeyResp(BaseModel):
    """API Key 响应，plain_key 仅创建时出现一次。"""

    id: UUID
    name: str
    key_prefix: str
    plain_key: str | None = None
    revoked_at: datetime | None = None
    created_at: datetime
