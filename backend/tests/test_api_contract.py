"""OpenAPI 和数据库迁移契约测试。"""

import re
from pathlib import Path

from app.main import app

ROOT = Path(__file__).resolve().parents[2]


def test_openapi_exposes_prd_api_surface() -> None:
    """PRD 要求 74 个 API，当前 OpenAPI 操作数不得低于该目标。"""
    schema = app.openapi()
    operation_count = sum(len(methods) for methods in schema["paths"].values())
    assert operation_count >= 74
    for path in [
        "/api/v1/auth/login",
        "/api/v1/materials",
        "/api/v1/videos",
        "/api/v1/images",
        "/api/v1/canvases",
        "/api/v1/tools",
        "/api/v1/community/works",
        "/api/v1/conversations",
        "/api/v1/credits/balance",
        "/api/v1/admin/dashboard",
    ]:
        assert path in schema["paths"]


def test_migration_defines_required_schemas_and_tables() -> None:
    """001 迁移必须覆盖 PRD 指定的 6 个 schema 和 18 张表。"""
    migration = (ROOT / "backend/migrations/001_create_schema.sql").read_text(encoding="utf-8")
    for schema in ["public", "video", "image", "canvas", "community", "chat"]:
        if schema == "public":
            assert "public.users" in migration
        else:
            assert f"CREATE SCHEMA IF NOT EXISTS {schema};" in migration

    table_names = set(re.findall(r"CREATE TABLE IF NOT EXISTS ([a-z_]+\.[a-z_]+)", migration))
    assert {
        "public.users",
        "public.api_keys",
        "public.credit_records",
        "public.credit_recharge_orders",
        "public.materials",
        "public.material_references",
        "public.audit_logs",
        "video.video_generation_jobs",
        "video.video_processing_jobs",
        "video.provider_accounts",
        "image.image_generation_jobs",
        "canvas.canvases",
        "canvas.canvas_elements",
        "community.community_works",
        "community.community_likes",
        "community.community_bookmarks",
        "chat.conversations",
        "chat.conversation_messages",
    } <= table_names


def test_seed_data_contains_required_providers() -> None:
    """种子数据必须包含视频和图片 provider。"""
    seed = (ROOT / "backend/migrations/002_seed_data.sql").read_text(encoding="utf-8")
    for provider in [
        "google_gemini",
        "google_vertex",
        "seedance",
        "kling",
        "runway",
        "mock",
        "flux",
        "sdxl",
        "dalle",
        "ideogram",
    ]:
        assert provider in seed
