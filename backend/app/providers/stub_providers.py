"""真实 Provider 骨架；未配置或 V1.1 功能统一返回明确错误码。"""

from app.config import get_settings
from app.core.exceptions import ProviderError
from app.core.provider_base import (
    BaseImageProvider,
    BaseVideoProvider,
    ImageGenParams,
    ProviderModel,
    ProviderResult,
    VideoGenParams,
)


class ConfigurableVideoProvider(BaseVideoProvider):
    """配置型视频 Provider 骨架，API Key 缺失返回 E200。"""

    def __init__(self, provider_key: str, model_id: str, name: str, config_key: str) -> None:
        self.provider_key = provider_key
        self.model_id = model_id
        self.name = name
        self.config_key = config_key

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        if not getattr(get_settings(), self.config_key):
            raise ProviderError("E200", f"{self.name} 服务未配置")
        raise ProviderError("E201", f"{self.name} 真实调用将在 V1.1 接入", 501)

    def get_model_list(self) -> list[ProviderModel]:
        configured = bool(getattr(get_settings(), self.config_key))
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=self.name,
                modality="video",
                status="configured" if configured else "coming_soon",
                credit_cost=80,
            )
        ]

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(80, duration_seconds * 4)


class ComingSoonVideoProvider(BaseVideoProvider):
    """V1.0 仅保留接口的第三方视频 Provider。"""

    def __init__(self, provider_key: str, model_id: str, name: str) -> None:
        self.provider_key = provider_key
        self.model_id = model_id
        self.name = name

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        raise ProviderError("E201", f"{self.name} 功能即将上线", 501)

    def get_model_list(self) -> list[ProviderModel]:
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=self.name,
                modality="video",
                status="coming_soon",
                credit_cost=80,
            )
        ]

    def estimate_cost(self, model_id: str, duration_seconds: int) -> int:
        return max(80, duration_seconds * 4)


class ConfigurableImageProvider(BaseImageProvider):
    """配置型图片 Provider 骨架。"""

    def __init__(self, provider_key: str, model_id: str, name: str, config_key: str) -> None:
        self.provider_key = provider_key
        self.model_id = model_id
        self.name = name
        self.config_key = config_key

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        if not getattr(get_settings(), self.config_key):
            raise ProviderError("E200", f"{self.name} 服务未配置")
        raise ProviderError("E201", f"{self.name} 真实调用将在 V1.1 接入", 501)

    def get_model_list(self) -> list[ProviderModel]:
        configured = bool(getattr(get_settings(), self.config_key))
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=self.name,
                modality="image",
                status="configured" if configured else "coming_soon",
                credit_cost=20,
            )
        ]

    def estimate_cost(self, model_id: str, resolution: str) -> int:
        return {"512": 10, "1024": 20, "2048": 40, "4096": 80}.get(resolution, 20)


class ComingSoonImageProvider(BaseImageProvider):
    """V1.0 仅保留接口的第三方图片 Provider。"""

    def __init__(self, provider_key: str, model_id: str, name: str) -> None:
        self.provider_key = provider_key
        self.model_id = model_id
        self.name = name

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        raise ProviderError("E201", f"{self.name} 功能即将上线", 501)

    def get_model_list(self) -> list[ProviderModel]:
        return [
            ProviderModel(
                model_id=self.model_id,
                provider=self.provider_key,
                name=self.name,
                modality="image",
                status="coming_soon",
                credit_cost=20,
            )
        ]

    def estimate_cost(self, model_id: str, resolution: str) -> int:
        return {"512": 10, "1024": 20, "2048": 40, "4096": 80}.get(resolution, 20)
