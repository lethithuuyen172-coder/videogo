"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

export function OpenAIKeyBox() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(localStorage.getItem("openai_api_key") ?? "");
  }, []);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem("openai_api_key", trimmed);
    } else {
      localStorage.removeItem("openai_api_key");
    }
    window.dispatchEvent(new Event("openai-api-key-updated"));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="rounded-md border border-line bg-panel p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <KeyRound size={16} />
        OpenAI API Key
      </div>
      <input
        className="w-full rounded-md border border-line px-3 py-2"
        type="password"
        placeholder="sk-..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="mt-2 rounded-md bg-accent px-3 py-2 text-white" onClick={save}>
        保存
      </button>
      {saved ? <span className="ml-2 text-xs text-signal">已保存到本机浏览器</span> : null}
    </div>
  );
}
