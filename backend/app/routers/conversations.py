"""AI 对话 API，使用 SSE 提供本地 mock 流式回复。"""

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.responses import ok
from app.models.chat import ConversationCreateReq, ConversationResp, MessageCreateReq, MessageResp
from app.routers.auth import get_current_user
from app.services.conversation_service import ConversationService

router = APIRouter(tags=["conversations"])


def get_conversation_service() -> ConversationService:
    return ConversationService()


@router.post("")
async def create_conversation(
    req: ConversationCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
) -> dict:
    """创建 AI 对话。"""
    conversation = await service.create_conversation(current_user["id"], req)
    return ok(ConversationResp(**conversation).model_dump(mode="json"), request)


@router.get("")
async def list_conversations(
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
) -> dict:
    """查询对话列表。"""
    conversations = await service.list_conversations(current_user["id"])
    return ok(
        [ConversationResp(**conversation).model_dump(mode="json") for conversation in conversations],
        request,
    )


@router.get("/{conversation_id}/messages")
async def list_messages(
    conversation_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
) -> dict:
    """查询对话消息。"""
    messages = await service.list_messages(current_user["id"], conversation_id)
    return ok([MessageResp(**message).model_dump(mode="json") for message in messages], request)


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: UUID,
    req: MessageCreateReq,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
) -> dict:
    """发送用户消息并生成一条非流式 mock 回复。"""
    message = await service.send_message(current_user["id"], conversation_id, req)
    return ok(MessageResp(**message).model_dump(mode="json"), request)


@router.post("/{conversation_id}/stream")
async def stream_message(
    conversation_id: UUID,
    req: MessageCreateReq,
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """SSE 流式回复，首包立即返回，满足基础 Agent 体验。"""

    async def event_stream():
        text = f"我会基于当前 Agent 技能处理你的请求：{req.content}"
        for token in text.split():
            yield f"data: {token}\n\n"
            await asyncio.sleep(0.02)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
