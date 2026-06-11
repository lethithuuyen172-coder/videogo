"""AI 对话 API，使用 SSE 提供流式回复。"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.core.exceptions import AppError
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
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
) -> StreamingResponse:
    """SSE 流式回复。"""
    settings = get_settings()
    openai_api_key = request.headers.get("x-openai-api-key")
    effective_key = openai_api_key or settings.openai_api_key
    if not effective_key or effective_key == "sk-your-key-here":
        raise AppError("E101", "请先配置 OPENAI_API_KEY", 400)

    return StreamingResponse(
        service.stream_chat(current_user["id"], conversation_id, req.content, openai_api_key),
        media_type="text/event-stream",
    )
