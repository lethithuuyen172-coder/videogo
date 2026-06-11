"use client";

import { useEffect, useRef } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function ChatMessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`max-w-[80%] rounded-md border border-line px-3 py-2 text-sm ${
            message.role === "user" ? "ml-auto bg-accent text-white" : "bg-white"
          }`}
        >
          {message.content}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
