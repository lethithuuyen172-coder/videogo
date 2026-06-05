"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Panel } from "@/components/Panel";
import { ImagePreview } from "./components/ImagePreview";
import { ImageSettingsPanel } from "./components/ImageSettingsPanel";
import { useImageGeneration } from "./hooks/useImageGeneration";

export default function ImagePage() {
  const [prompt, setPrompt] = useState("一张高转化电商产品主图，干净背景，真实光影");
  const [modelId, setModelId] = useState("mock-image");
  const [resolution, setResolution] = useState("1024");
  const [runMode, setRunMode] = useState<"sync" | "queue">("sync");
  const { job, error, isRunning, createJob } = useImageGeneration();

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <Panel title="图片参数">
        <ImageSettingsPanel modelId={modelId} setModelId={setModelId} resolution={resolution} setResolution={setResolution} />
      </Panel>
      <Panel title="预览">
        <ImagePreview url={job?.output_url} progress={job?.progress ?? 0} />
      </Panel>
      <Panel title="提示词">
        <textarea className="h-52 w-full resize-none rounded-md border border-line p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            { label: "同步Mock", value: "sync" },
            { label: "异步队列", value: "queue" },
          ].map((item) => (
            <button
              key={item.value}
              className={`rounded-md border border-line px-3 py-2 ${
                runMode === item.value ? "bg-accent text-white" : "bg-white"
              }`}
              onClick={() => setRunMode(item.value as "sync" | "queue")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isRunning}
          onClick={() => createJob({ prompt, model_id: modelId, resolution }, runMode)}
        >
          <Sparkles size={16} />
          {isRunning ? "生成中" : "生成图片"}
        </button>
        {job ? <p className="mt-3 text-xs text-slate-500">任务 {job.id} · {job.status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Panel>
    </div>
  );
}
