"use client";

type Message = { role: "user" | "assistant"; content: string };

export function ChatMessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="grid gap-3">
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
    </div>
  );
}
