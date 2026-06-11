"use client";

import { useEffect, useState } from "react";
import { OpenAIKeyBox } from "@/components/OpenAIKeyBox";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageList } from "./components/ChatMessageList";
import { SkillPanel } from "./components/SkillPanel";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; skill_key: string; created_at: string };
type ApiMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };

export default function ChatPage() {
  const [skill, setSkill] = useState("general");
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "选择技能后输入需求，我会以 Agent 模式协助生成内容。" },
  ]);

  useEffect(() => {
    apiClient.get<Conversation[]>("/conversations").then((items) => {
      setConversations(items);
      if (items[0]) setConversationId(items[0].id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    apiClient.get<ApiMessage[]>(`/conversations/${conversationId}/messages`).then((items) => {
      setMessages(items.length ? items.map((item) => ({ role: item.role, content: item.content })) : []);
    }).catch((err) => setError(err instanceof Error ? err.message : "消息加载失败"));
  }, [conversationId]);

  const newConversation = async () => {
    setError(null);
    try {
      const created = await apiClient.post<Conversation>("/conversations", { title: "新对话", skill_key: skill });
      setConversations((items) => [created, ...items]);
      setConversationId(created.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "新对话创建失败");
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    setError(null);
    setSending(true);
    setInput("");
    let activeId = conversationId;
    try {
      if (!activeId) {
        const created = await apiClient.post<Conversation>("/conversations", { title: content.slice(0, 32), skill_key: skill });
        activeId = created.id;
        setConversationId(created.id);
        setConversations((items) => [created, ...items]);
      }
      setMessages((items) => [...items, { role: "user", content }, { role: "assistant", content: "" }]);
      const stream = await apiClient.streamPost(`/conversations/${activeId}/stream`, { content });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as { token: string };
          setMessages((items) => {
            const copy = [...items];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: `${last.content}${parsed.token}` };
            return copy;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-32px)] gap-4 lg:grid-cols-[220px_1fr_260px]">
      <Panel title="历史对话">
        <button className="mb-3 w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={newConversation}>
          新对话
        </button>
        <div className="grid gap-2">
          {conversations.map((item) => (
            <button
              key={item.id}
              className={`rounded-md border border-line px-3 py-2 text-left text-sm ${conversationId === item.id ? "bg-panel" : "bg-white"}`}
              onClick={() => setConversationId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="对话">
        <div className="flex min-h-[640px] flex-col justify-between gap-4">
          <ChatMessageList messages={messages} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <ChatInput value={input} setValue={setInput} onSend={send} disabled={isSending} />
        </div>
      </Panel>
      <Panel title="技能">
        <div className="mb-3">
          <OpenAIKeyBox />
        </div>
        <SkillPanel skill={skill} setSkill={setSkill} />
      </Panel>
    </div>
  );
}
