"""社区发现模块契约测试。"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.community import WorkCreateReq, WorkResp


def test_community_routes_cover_publish_interactions_and_my_works() -> None:
    """社区模块必须暴露作品流、发布、详情、点赞、收藏和我的作品。"""
    paths = app.openapi()["paths"]
    assert "/api/v1/community/works" in paths
    assert "/api/v1/community/works/{work_id}" in paths
    assert "/api/v1/community/works/{work_id}/like" in paths
    assert "/api/v1/community/works/{work_id}/bookmark" in paths
    assert "/api/v1/community/my/works" in paths


def test_work_type_is_enumerated() -> None:
    """社区作品类型只允许视频、图片和画布。"""
    assert WorkCreateReq(work_type="video", title="demo").work_type == "video"
    with pytest.raises(ValidationError):
        WorkCreateReq(work_type="audio", title="bad")


def test_work_response_rejects_unknown_type() -> None:
    """社区响应模型不能返回未定义作品类型。"""
    with pytest.raises(ValidationError):
        WorkResp(
            id=uuid4(),
            work_type="audio",
            title="bad",
            description=None,
            cover_url=None,
            status="published",
            like_count=0,
            bookmark_count=0,
            created_at=datetime.now(UTC),
        )
