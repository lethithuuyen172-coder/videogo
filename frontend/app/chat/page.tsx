"use client";

import { useState } from "react";
import { Panel } from "@/components/Panel";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageList } from "./components/ChatMessageList";
import { SkillPanel } from "./components/SkillPanel";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [skill, setSkill] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "选择技能后输入需求，我会以 Agent 模式协助生成内容。" },
  ]);

  const send = () => {
    const content = input.trim();
    if (!content) return;
    setMessages((items) => [
      ...items,
      { role: "user", content },
      { role: "assistant", content: `已切换到 ${skill} 技能，下一步会生成可执行内容。` },
    ]);
    setInput("");
  };

  return (
    <div className="grid min-h-[calc(100vh-32px)] gap-4 lg:grid-cols-[220px_1fr_260px]">
      <Panel title="历史对话">
        <div className="text-sm text-slate-500">新对话</div>
      </Panel>
      <Panel title="对话">
        <div className="flex min-h-[640px] flex-col justify-between gap-4">
          <ChatMessageList messages={messages} />
          <ChatInput value={input} setValue={setInput} onSend={send} />
        </div>
      </Panel>
      <Panel title="技能">
        <SkillPanel skill={skill} setSkill={setSkill} />
      </Panel>
    </div>
  );
}
