"""文件存储抽象，支持本地开发和 Cloudflare R2。"""

from abc import ABC, abstractmethod
from pathlib import Path
from uuid import uuid4

import boto3

from app.config import get_settings
from app.core.exceptions import AppError

IMAGE_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"RIFF")
VIDEO_MAGIC = (b"\x00\x00\x00",)


class StorageObject:
    """上传结果，供素材服务写入数据库。"""

    def __init__(self, key: str, url: str, size_bytes: int) -> None:
        self.key = key
        self.url = url
        self.size_bytes = size_bytes


class StorageService(ABC):
    """存储服务统一接口。"""

    @abstractmethod
    async def upload(self, content: bytes, content_type: str, suffix: str) -> StorageObject:
        """上传文件并返回可访问 URL。"""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """删除指定对象。"""


def validate_magic(content: bytes, content_type: str) -> None:
    """用文件魔数兜底校验，防止伪造 MIME 类型。"""
    if content_type.startswith("image/") and not content.startswith(IMAGE_MAGIC):
        raise AppError("E011", "不支持的图片文件格式", 415)
    if content_type.startswith("video/") and len(content) < 12:
        raise AppError("E011", "不支持的视频文件格式", 415)


class LocalStorage(StorageService):
    """本地磁盘存储，用于开发和测试。"""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_path = Path(self.settings.local_storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def upload(self, content: bytes, content_type: str, suffix: str) -> StorageObject:
        validate_magic(content, content_type)
        key = f"{uuid4().hex}{suffix.lower()}"
        target = self.base_path / key
        target.write_bytes(content)
        return StorageObject(
            key=key,
            url=f"{self.settings.public_base_url}/storage/{key}",
            size_bytes=len(content),
        )

    async def delete(self, key: str) -> None:
        target = self.base_path / key
        if target.exists():
            target.unlink()


class S3Storage(StorageService):
    """Cloudflare R2/S3 兼容存储实现。"""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = boto3.client(
            "s3",
            endpoint_url=self.settings.r2_endpoint_url,
            aws_access_key_id=self.settings.r2_access_key_id,
            aws_secret_access_key=self.settings.r2_secret_access_key,
        )

    async def upload(self, content: bytes, content_type: str, suffix: str) -> StorageObject:
        validate_magic(content, content_type)
        key = f"{uuid4().hex}{suffix.lower()}"
        self.client.put_object(
            Bucket=self.settings.r2_bucket_name,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.settings.r2_bucket_name, "Key": key},
            ExpiresIn=3600,
        )
        return StorageObject(key=key, url=url, size_bytes=len(content))

    async def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.settings.r2_bucket_name, Key=key)


def get_storage() -> StorageService:
    """按配置选择本地或 R2 存储。"""
    settings = get_settings()
    if settings.storage_backend == "r2":
        return S3Storage()
    return LocalStorage()
