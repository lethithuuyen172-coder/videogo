"""Provider 路由器，根据模型 ID 分发到视频或图片 Provider。"""

from app.core.exceptions import AppError
from app.core.provider_base import (
    BaseImageProvider,
    BaseVideoProvider,
    ImageGenParams,
    ProviderModel,
    ProviderResult,
    VideoGenParams,
)
from app.providers.mock_image_provider import MockImageProvider
from app.providers.mock_video_provider import MockVideoProvider
from app.providers.stub_providers import (
    ComingSoonVideoProvider,
    ConfigurableImageProvider,
    ConfigurableVideoProvider,
)


class ProviderRouter:
    """维护模型到 Provider 的映射，保证 mock 模型始终可用。"""

    def __init__(self) -> None:
        self.video_providers: dict[str, BaseVideoProvider] = {}
        self.image_providers: dict[str, BaseImageProvider] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        video = [
            MockVideoProvider(),
            ConfigurableVideoProvider("google_gemini", "google-veo-gemini", "Google Veo Gemini", "gemini_api_key"),
            ConfigurableVideoProvider("google_vertex", "google-veo-vertex", "Google Veo Vertex", "google_vertex_project"),
            ComingSoonVideoProvider("seedance", "seedance-video", "Seedance"),
            ComingSoonVideoProvider("kling", "kling-video", "Kling"),
            ComingSoonVideoProvider("runway", "runway-video", "Runway"),
        ]
        image = [
            MockImageProvider(),
            ConfigurableImageProvider("flux", "flux-schnell", "Flux Schnell", "flux_api_key"),
            ConfigurableImageProvider("sdxl", "sdxl-turbo", "SDXL Turbo", "sdxl_api_key"),
            ConfigurableImageProvider("dalle", "dalle-3", "DALL-E 3", "dalle_api_key"),
            ConfigurableImageProvider("ideogram", "ideogram-v2", "Ideogram", "ideogram_api_key"),
        ]
        for provider in video:
            for model in provider.get_model_list():
                self.video_providers[model.model_id] = provider
        for provider in image:
            for model in provider.get_model_list():
                self.image_providers[model.model_id] = provider

    def list_models(self) -> list[ProviderModel]:
        """聚合全部模型，供前端模型选择器使用。"""
        models: list[ProviderModel] = []
        for provider in set(self.video_providers.values()):
            models.extend(provider.get_model_list())
        for provider in set(self.image_providers.values()):
            models.extend(provider.get_model_list())
        return models

    async def generate_video(self, model_id: str, params: VideoGenParams) -> ProviderResult:
        """路由视频生成请求。"""
        provider = self.video_providers.get(model_id)
        if provider is None:
            raise AppError("E001", "未知视频模型", 400, {"model_id": model_id})
        return await provider.generate_video(model_id, params)

    async def generate_image(self, model_id: str, params: ImageGenParams) -> ProviderResult:
        """路由图片生成请求。"""
        provider = self.image_providers.get(model_id)
        if provider is None:
            raise AppError("E001", "未知图片模型", 400, {"model_id": model_id})
        return await provider.generate_image(model_id, params)

    def estimate_video_cost(self, model_id: str, duration_seconds: int) -> int:
        """估算视频任务积分。"""
        provider = self.video_providers.get(model_id)
        if provider is None:
            raise AppError("E001", "未知视频模型", 400)
        return provider.estimate_cost(model_id, duration_seconds)

    def estimate_image_cost(self, model_id: str, resolution: str) -> int:
        """估算图片任务积分。"""
        provider = self.image_providers.get(model_id)
        if provider is None:
            raise AppError("E001", "未知图片模型", 400)
        return provider.estimate_cost(model_id, resolution)


provider_router = ProviderRouter()
