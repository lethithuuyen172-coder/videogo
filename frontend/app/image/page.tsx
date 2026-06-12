"use client";

import { useEffect, useState } from "react";
import { Clock3, ImagePlus, Layers3, Sparkles } from "lucide-react";
import { OpenAIKeyBox } from "@/components/OpenAIKeyBox";
import { apiClient } from "@/lib/api";
import { readCreationContext } from "@/lib/creationContext";
import { ImagePreview } from "./components/ImagePreview";
import { ImageSettingsPanel } from "./components/ImageSettingsPanel";
import { useImageGeneration } from "./hooks/useImageGeneration";

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string;
  status: string;
};

export default function ImagePage() {
  const [prompt, setPrompt] = useState("一张高转化电商产品主图，干净背景，真实光影");
  const [modelId, setModelId] = useState("");
  const [resolution, setResolution] = useState("1024");
  const [styleKey, setStyleKey] = useState("");
  const [runMode, setRunMode] = useState<"sync" | "queue">("sync");
  const [referenceAsset, setReferenceAsset] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const { job, error, isRunning, createJob } = useImageGeneration();
  const effectiveRunMode = modelId === "dalle-3" ? "sync" : runMode;
  const estimatedCredits = (resolution === "2048" ? 80 : resolution === "1024" ? 30 : 10) * batchCount;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const context = readCreationContext(searchParams);
    if (context.prompt || context.subject) {
      setPrompt([context.subject ? `主体：${context.subject}` : null, context.prompt].filter(Boolean).join("\n").slice(0, 2000));
    }
    if (context.reference) setReferenceAsset(context.reference);
    else if (context.subject_material_id) setReferenceAsset(context.subject_material_id);
  }, []);

  useEffect(() => {
    apiClient.get<Material[]>("/materials?material_type=image").then(setMaterials).catch(() => undefined);
  }, []);

  const submitImage = () => {
    createJob(
      {
        prompt,
        model_id: modelId,
        resolution,
        style_key: styleKey,
        aspect_ratio: aspectRatio,
        reference_image_url: referenceAsset || undefined,
      },
      effectiveRunMode);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">AI Image</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">AI 图片</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              对齐 DA 的图片生成流程：参考素材、提示词、模型风格、尺寸比例、生成数量、预览和任务状态集中处理。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <Metric label="数量" value={`${batchCount}`} />
            <Metric label="尺寸" value={resolution} />
            <Metric label="预计" value={`${estimatedCredits}`} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="grid gap-4">
          <Panel title="图片参数">
            <ImageSettingsPanel
              modelId={modelId}
              setModelId={setModelId}
              resolution={resolution}
              setResolution={setResolution}
              styleKey={styleKey}
              setStyleKey={setStyleKey}
            />
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              输出比例
              <select className="control" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                <option>1:1</option>
                <option>9:16</option>
                <option>16:9</option>
                <option>4:5</option>
              </select>
            </label>
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              新建数量
              <select className="control" value={batchCount} onChange={(event) => setBatchCount(Number(event.target.value))}>
                <option value={1}>1 张</option>
                <option value={2}>2 张</option>
                <option value={4}>4 张</option>
              </select>
            </label>
          </Panel>

          <Panel title="API Key">
            <OpenAIKeyBox />
          </Panel>
        </aside>

        <main className="grid gap-4">
          <Panel title="参考素材">
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <input
                className="control"
                value={referenceAsset}
                onChange={(event) => setReferenceAsset(event.target.value)}
                placeholder="粘贴参考图、商品图、素材 ID 或 URL"
              />
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#0071e3]" onClick={() => setShowMaterials((value) => !value)}>
                <ImagePlus size={16} />
                选择素材
              </button>
            </div>
            {showMaterials ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {materials.length === 0 ? <div className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-[#86868b]">暂无可选图片素材</div> : null}
                {materials.slice(0, 6).map((material) => (
                  <button
                    key={material.id}
                    className="rounded-lg border border-black/10 bg-white p-3 text-left text-sm hover:border-[#0071e3]"
                    onClick={() => {
                      setReferenceAsset(material.url || material.id);
                      setShowMaterials(false);
                    }}
                  >
                    <div className="truncate font-semibold">{material.title}</div>
                    <div className="mt-1 text-xs text-[#86868b]">{material.material_type} · {material.status}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel title="提示词">
            <textarea
              className="min-h-72 w-full resize-none rounded-lg border border-black/10 bg-[#f5f5f7] p-3 text-sm leading-6 outline-none focus:border-[#0071e3] focus:bg-white"
              maxLength={2000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="mt-2 flex justify-between text-xs text-[#86868b]">
              <span>支持商品主体、背景、光影、构图、风格和转化用途</span>
              <span>{prompt.length}/2000</span>
            </div>
          </Panel>
        </main>

        <aside className="grid h-fit gap-4">
          <Panel title="预览">
            <ImagePreview url={job?.output_url} progress={job?.progress ?? 0} />
          </Panel>
          <Panel title="生成">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: "立即生成", value: "sync" },
                { label: "任务队列", value: "queue" },
              ].map((item) => (
                <button
                  key={item.value}
                  className={`h-10 rounded-full border font-semibold ${effectiveRunMode === item.value ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/10 bg-white"}`}
                  disabled={modelId === "dalle-3" && item.value === "queue"}
                  onClick={() => setRunMode(item.value as "sync" | "queue")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {modelId === "dalle-3" ? <p className="mt-2 text-xs text-[#86868b]">DALL-E 使用浏览器填写的 OpenAI Key 时会立即生成，不进入后台队列。</p> : null}
            <button
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50"
              disabled={isRunning || !modelId}
              onClick={submitImage}
            >
              <Sparkles size={16} />
              {isRunning ? "生成中" : "立即生成"}
            </button>
            <div className="mt-4 grid gap-2 text-xs text-[#6e6e73]">
              <StatusLine icon={Clock3} label="预计积分" value={`${estimatedCredits}`} />
              <StatusLine icon={Layers3} label="模式" value={effectiveRunMode === "sync" ? "立即生成" : "任务队列"} />
              <StatusLine icon={ImagePlus} label="任务" value={job ? `${job.id} · ${job.status}` : "等待生成"} />
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </Panel>
        </aside>
      </section>
      <style jsx>{`
        .control {
          height: 44px;
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #f5f5f7;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }
        .control:focus {
          border-color: #0071e3;
          background: white;
          box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
        }
      `}</style>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 shadow-sm">
      <div className="text-[10px] text-[#86868b]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusLine({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[#f5f5f7] px-3 py-2">
      <span className="inline-flex items-center gap-2"><Icon size={14} className="text-[#0071e3]" />{label}</span>
      <span className="font-semibold text-[#1d1d1f]">{value}</span>
    </div>
  );
}
