"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Panel } from "@/components/Panel";
import { VideoPreview } from "./components/VideoPreview";
import { VideoSettingsPanel } from "./components/VideoSettingsPanel";
import { useVideoGeneration } from "./hooks/useVideoGeneration";

export default function VideoPage() {
  const [prompt, setPrompt] = useState("真实测评一款适合TikTok带货的智能小家电");
  const [modelId, setModelId] = useState("mock-video");
  const [duration, setDuration] = useState(15);
  const [runMode, setRunMode] = useState<"sync" | "queue">("sync");
  const { job, error, isRunning, createJob } = useVideoGeneration();

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
      <Panel title="视频参数">
        <VideoSettingsPanel modelId={modelId} setModelId={setModelId} duration={duration} setDuration={setDuration} />
      </Panel>
      <Panel title="预览">
        <VideoPreview url={job?.output_url} progress={job?.progress ?? 0} />
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
          onClick={() => createJob({ prompt, model_id: modelId, duration_seconds: duration }, runMode)}
        >
          <Play size={16} />
          {isRunning ? "生成中" : "生成视频"}
        </button>
        {job ? <p className="mt-3 text-xs text-slate-500">任务 {job.id} · {job.status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Panel>
    </div>
  );
}
