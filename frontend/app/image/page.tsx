"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { OpenAIKeyBox } from "@/components/OpenAIKeyBox";
import { Panel } from "@/components/Panel";
import { ImagePreview } from "./components/ImagePreview";
import { ImageSettingsPanel } from "./components/ImageSettingsPanel";
import { useImageGeneration } from "./hooks/useImageGeneration";

export default function ImagePage() {
  const [prompt, setPrompt] = useState("一张高转化电商产品主图，干净背景，真实光影");
  const [modelId, setModelId] = useState("");
  const [resolution, setResolution] = useState("1024");
  const [styleKey, setStyleKey] = useState("");
  const [runMode, setRunMode] = useState<"sync" | "queue">("sync");
  const { job, error, isRunning, createJob } = useImageGeneration();
  const effectiveRunMode = modelId === "dalle-3" ? "sync" : runMode;

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <Panel title="图片参数">
        <ImageSettingsPanel
          modelId={modelId}
          setModelId={setModelId}
          resolution={resolution}
          setResolution={setResolution}
          styleKey={styleKey}
          setStyleKey={setStyleKey}
        />
      </Panel>
      <Panel title="预览">
        <ImagePreview url={job?.output_url} progress={job?.progress ?? 0} />
      </Panel>
      <Panel title="提示词">
        <div className="mb-3">
          <OpenAIKeyBox />
        </div>
        <textarea className="h-52 w-full resize-none rounded-md border border-line p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            { label: "立即生成", value: "sync" },
            { label: "异步队列", value: "queue" },
          ].map((item) => (
            <button
              key={item.value}
              className={`rounded-md border border-line px-3 py-2 ${
                effectiveRunMode === item.value ? "bg-accent text-white" : "bg-white"
              }`}
              disabled={modelId === "dalle-3" && item.value === "queue"}
              onClick={() => setRunMode(item.value as "sync" | "queue")}
            >
              {item.label}
            </button>
          ))}
        </div>
        {modelId === "dalle-3" ? (
          <p className="mt-2 text-xs text-slate-500">DALL-E 使用浏览器填写的 OpenAI Key 时会立即生成，不进入后台队列。</p>
        ) : null}
        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isRunning || !modelId}
          onClick={() => createJob({ prompt, model_id: modelId, resolution, style_key: styleKey }, effectiveRunMode)}
        >
          <Sparkles size={16} />
          {isRunning ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {isRunning ? "生成中" : "生成图片"}
        </button>
        {job ? <p className="mt-3 text-xs text-slate-500">任务 {job.id} · {job.status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Panel>
    </div>
  );
}
