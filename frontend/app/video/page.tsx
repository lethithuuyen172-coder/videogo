"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, WandSparkles } from "lucide-react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";
import { VideoPreview } from "./components/VideoPreview";
import { VideoSettingsPanel } from "./components/VideoSettingsPanel";
import { useVideoGeneration } from "./hooks/useVideoGeneration";

type ScriptTemplate = {
  key: string;
  platform: "tiktok" | "douyin";
  source_id: number;
  name: string;
  category: string;
  archetype: string;
};

type GeneratedScript = {
  template: ScriptTemplate;
  script: Array<Record<string, string>>;
  video_prompt: string;
};

export default function VideoPage() {
  const [prompt, setPrompt] = useState("真实测评一款适合TikTok带货的智能小家电");
  const [modelId, setModelId] = useState("");
  const [duration, setDuration] = useState(8);
  const [runMode, setRunMode] = useState<"sync" | "queue">("sync");
  const [platform, setPlatform] = useState<"tiktok" | "douyin">("tiktok");
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState("tiktok-28");
  const [productName, setProductName] = useState("便携榨汁杯");
  const [sellingPoints, setSellingPoints] = useState("一键清洗, 杯身轻便, 早餐更省事");
  const [targetMarket, setTargetMarket] = useState("US");
  const [targetAudience, setTargetAudience] = useState("25-40岁短视频购物用户");
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [scriptError, setScriptError] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const { job, error, isRunning, createJob } = useVideoGeneration();
  const platformTemplates = useMemo(() => templates.filter((item) => item.platform === platform), [platform, templates]);

  useEffect(() => {
    apiClient.get<ScriptTemplate[]>("/videos/scripts/templates").then((items) => {
      setTemplates(items);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const next = platform === "douyin" ? "douyin-082" : "tiktok-28";
    setTemplateKey(next);
    setTargetMarket(platform === "douyin" ? "全国通投" : "US");
  }, [platform]);

  const generateScript = async () => {
    setIsGeneratingScript(true);
    setScriptError("");
    try {
      const points = sellingPoints.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
      const result = await apiClient.post<GeneratedScript>("/videos/scripts", {
        product_name: productName,
        selling_points: points,
        duration_seconds: duration,
        language: platform === "douyin" ? "zh" : "en",
        platform,
        template_key: templateKey,
        target_market: targetMarket,
        target_audience: targetAudience,
        style_preference: platform === "douyin" ? "UGC原生真实感" : "native UGC",
        call_to_action: platform === "douyin" ? "左下角小黄车领券" : "Tap the link to shop",
      });
      setScript(result);
      setPrompt(result.video_prompt.slice(0, 4000));
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : "脚本生成失败");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
      <Panel title="视频参数">
        <VideoSettingsPanel modelId={modelId} setModelId={setModelId} duration={duration} setDuration={setDuration} />
        <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "TikTok", value: "tiktok" },
              { label: "抖音", value: "douyin" },
            ].map((item) => (
              <button
                key={item.value}
                className={`rounded-md border border-line px-3 py-2 ${platform === item.value ? "bg-accent text-white" : "bg-white"}`}
                onClick={() => setPlatform(item.value as "tiktok" | "douyin")}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="grid gap-1">
            脚本 Skill
            <select className="rounded-md border border-line px-3 py-2" value={templateKey} onChange={(event) => setTemplateKey(event.target.value)}>
              {platformTemplates.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.source_id}. {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            产品
            <input className="rounded-md border border-line px-3 py-2" value={productName} onChange={(event) => setProductName(event.target.value)} />
          </label>
          <label className="grid gap-1">
            卖点
            <textarea className="h-20 resize-none rounded-md border border-line px-3 py-2" value={sellingPoints} onChange={(event) => setSellingPoints(event.target.value)} />
          </label>
          <label className="grid gap-1">
            市场
            <input className="rounded-md border border-line px-3 py-2" value={targetMarket} onChange={(event) => setTargetMarket(event.target.value)} />
          </label>
          <label className="grid gap-1">
            人群
            <input className="rounded-md border border-line px-3 py-2" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
            disabled={isGeneratingScript || !productName || !templateKey}
            onClick={generateScript}
          >
            <WandSparkles size={16} />
            {isGeneratingScript ? "生成中" : "生成脚本"}
          </button>
          {scriptError ? <p className="text-sm text-red-600">{scriptError}</p> : null}
        </div>
      </Panel>
      <Panel title="预览">
        <VideoPreview url={job?.output_url} progress={job?.progress ?? 0} />
        {script ? (
          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <div className="border-b border-line bg-slate-50 px-3 py-2 text-sm font-semibold">
              {script.template.source_id}. {script.template.name}
            </div>
            <div className="grid gap-2 p-3 text-xs text-slate-600 md:grid-cols-2">
              {script.script.map((shot) => (
                <div key={shot.shot} className="rounded-md bg-white p-2">
                  <div className="font-semibold text-slate-900">{shot.shot} · {shot.time} · {shot.goal}</div>
                  <p className="mt-1 leading-5">{shot.visual}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>
      <Panel title="提示词">
        <textarea className="h-52 w-full resize-none rounded-md border border-line p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            { label: "立即生成", value: "sync" },
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
          disabled={isRunning || !modelId}
          onClick={() => createJob({ prompt, model_id: modelId, duration_seconds: duration }, runMode)}
        >
          <Play size={16} />
          {isRunning ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {isRunning ? "生成中" : "生成视频"}
        </button>
        {job ? <p className="mt-3 text-xs text-slate-500">任务 {job.id} · {job.status}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Panel>
    </div>
  );
}
