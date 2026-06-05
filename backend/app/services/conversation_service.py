"""AI 对话业务逻辑，封装会话和消息持久化。"""

from uuid import UUID

from app.core.database import get_pool
from app.core.exceptions import AppError
from app.models.chat import ConversationCreateReq, MessageCreateReq


class ConversationService:
    """对话服务，保证用户只能访问自己的会话。"""

    async def create_conversation(self, user_id: UUID, req: ConversationCreateReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO chat.conversations (user_id, title, skill_key)
                VALUES ($1,$2,$3) RETURNING *
                """,
                user_id,
                req.title,
                req.skill_key,
            )
        return dict(row)

    async def list_conversations(self, user_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM chat.conversations
                WHERE user_id=$1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                user_id,
            )
        return [dict(row) for row in rows]

    async def list_messages(self, user_id: UUID, conversation_id: UUID) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT m.* FROM chat.conversation_messages m
                JOIN chat.conversations c ON c.id=m.conversation_id
                WHERE c.id=$1 AND c.user_id=$2 AND m.deleted_at IS NULL
                ORDER BY m.created_at
                """,
                conversation_id,
                user_id,
            )
        return [dict(row) for row in rows]

    async def send_message(self, user_id: UUID, conversation_id: UUID, req: MessageCreateReq) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            owner = await conn.fetchval(
                "SELECT user_id FROM chat.conversations WHERE id=$1 AND deleted_at IS NULL",
                conversation_id,
            )
            if owner != user_id:
                raise AppError("E004", "对话不存在", 404)
            user_row = await conn.fetchrow(
                """
                INSERT INTO chat.conversation_messages
                  (user_id, conversation_id, role, content)
                VALUES ($1,$2,'user',$3) RETURNING *
                """,
                user_id,
                conversation_id,
                req.content,
            )
            assistant_text = f"已收到你的需求。我将按当前技能上下文处理：{req.content[:120]}"
            await conn.execute(
                """
                INSERT INTO chat.conversation_messages
                  (user_id, conversation_id, role, content)
                VALUES ($1,$2,'assistant',$3)
                """,
                user_id,
                conversation_id,
                assistant_text,
            )
        return dict(user_row)
