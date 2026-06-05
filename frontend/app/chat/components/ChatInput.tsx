"use client";

import { Send } from "lucide-react";

export function ChatInput({ value, setValue, onSend }: { value: string; setValue: (value: string) => void; onSend: () => void }) {
  return (
    <div className="flex gap-2">
      <textarea
        className="max-h-32 min-h-12 flex-1 resize-none rounded-md border border-line p-3 text-sm"
        value={value}
        maxLength={4000}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />
      <button className="h-12 w-12 rounded-md bg-accent text-white" onClick={onSend} aria-label="发送">
        <Send className="mx-auto" size={18} />
      </button>
    </div>
  );
}
