"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Gauge,
  ImageUp,
  Loader2,
  RadioTower,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type EnhancePresets = {
  resolutions: string[];
  fps: number[];
  denoise: string[];
};

type ToolTask = {
  id: string;
  status: string;
  credit_cost: number;
  rq_job_id?: string | null;
};

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string | null;
  status: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function EnhancePage() {
  const [presets, setPresets] = useState<EnhancePresets>({ resolutions: ["2K", "4K"], fps: [30, 60], denoise: ["low", "medium", "high"] });
  const [resolution, setResolution] = useState("4K");
  const [fps, setFps] = useState(60);
  const [denoise, setDenoise] = useState("medium");
  const [asset, setAsset] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [notes, setNotes] = useState("提升商品视频清晰度，保留真实质感和字幕可读性");
  const [task, setTask] = useState<ToolTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setRunning] = useState(false);

  useEffect(() => {
    apiClient.get<EnhancePresets>("/tools/enhance/presets").then((next) => {
      setPresets(next);
      setResolution(next.resolutions.at(-1) ?? "4K");
      setFps(next.fps.at(-1) ?? 60);
      setDenoise(next.denoise[1] ?? next.denoise[0] ?? "medium");
    }).catch(() => undefined);
    apiClient.get<Material[]>("/materials").then((items) => {
      setMaterials(items.filter((item) => item.material_type === "image" || item.material_type === "video"));
    }).catch(() => undefined);
  }, []);

  const createTask = async () => {
    setError(null);
    setTask(null);
    setRunning(true);
    try {
      const payload = {
        input_material_id: uuidPattern.test(asset.trim()) ? asset.trim() : undefined,
        asset_url: asset,
        resolution,
        fps,
        denoise,
        notes,
      };
      const created = await apiClient.post<ToolTask>("/tools/enhance/tasks", payload);
      setTask(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画质增强任务创建失败");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]" href="/tools">
        <ArrowLeft size={16} />
        返回工具箱
      </Link>

      <section className="grid gap-5 rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl xl:grid-cols-[1fr_340px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Enhance Tool</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">画质增强</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
            对齐 DA 的工具技能入口：上传或粘贴素材，选择分辨率、帧率和降噪等级，创建真实后端处理任务。
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric icon={ImageUp} label="目标分辨率" value={resolution} />
            <Metric icon={Gauge} label="目标帧率" value={`${fps} fps`} />
            <Metric icon={SlidersHorizontal} label="降噪" value={denoise} />
          </div>
        </div>
        <div className="rounded-lg bg-[#1d1d1f] p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <RadioTower size={18} className="text-[#0a84ff]" />
            后端任务
          </div>
          {task ? (
            <div className="mt-4 rounded-lg bg-[#12381f] p-4 text-sm leading-6 text-white/82">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                <BadgeCheck size={16} className="text-[#30d158]" />
                已创建
              </div>
              <div>ID：{task.id}</div>
              <div>状态：{task.status}</div>
              <div>积分：{task.credit_cost}</div>
              {task.rq_job_id ? <div>队列：{task.rq_job_id}</div> : null}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-white/10 p-4 text-sm leading-6 text-white/70">
              画质增强是当前可用工具，创建后进入 tool:normal 队列。
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid h-fit gap-4">
          <Panel title="增强参数">
            <Field label="目标分辨率">
              <select className="control" value={resolution} onChange={(event) => setResolution(event.target.value)}>
                {presets.resolutions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="目标帧率">
              <select className="control" value={fps} onChange={(event) => setFps(Number(event.target.value))}>
                {presets.fps.map((item) => <option key={item} value={item}>{item} fps</option>)}
              </select>
            </Field>
            <Field label="降噪等级">
              <div className="grid grid-cols-3 gap-2">
                {presets.denoise.map((item) => (
                  <button
                    key={item}
                    className={`h-10 rounded-full border text-sm font-semibold ${denoise === item ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/10 bg-white text-[#1d1d1f]"}`}
                    onClick={() => setDenoise(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </Field>
          </Panel>
          <Panel title="消耗预估">
            <div className="rounded-lg bg-[#f5f5f7] p-4">
              <div className="text-xs text-[#86868b]">当前工具固定消耗</div>
              <div className="mt-1 text-3xl font-semibold">30</div>
              <div className="mt-1 text-xs text-[#86868b]">积分 / 次</div>
            </div>
          </Panel>
        </aside>

        <main className="grid gap-4">
          <Panel title="素材与目标">
            <Field label="素材链接 / 素材 ID">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <input
                  className="control"
                  value={asset}
                  onChange={(event) => {
                    setAsset(event.target.value);
                    setSelectedMaterial(null);
                  }}
                  placeholder="粘贴视频、图片、素材 ID 或存储 URL"
                />
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold text-[#0071e3]" onClick={() => setShowMaterials((value) => !value)}>
                  <ImageIcon size={16} />
                  选择素材
                </button>
              </div>
            </Field>
            {showMaterials ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {materials.length === 0 ? <div className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-[#86868b]">暂无可选图片或视频素材，先去资产中心上传。</div> : null}
                {materials.slice(0, 8).map((material) => (
                  <button
                    key={material.id}
                    className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-lg border border-black/10 bg-white p-2 text-left text-sm hover:border-[#0071e3]"
                    onClick={() => {
                      setAsset(material.id);
                      setSelectedMaterial(material);
                      setShowMaterials(false);
                    }}
                  >
                    <div className="h-14 overflow-hidden rounded-md bg-[#f5f5f7]">
                      {material.material_type === "image" && material.url ? <img className="h-full w-full object-cover" src={material.url} alt={material.title} /> : null}
                      {material.material_type === "video" && material.url ? <video className="h-full w-full object-cover" src={material.url} /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{material.title}</div>
                      <div className="mt-1 text-xs text-[#86868b]">{material.material_type} · {material.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            {selectedMaterial ? (
              <div className="mt-3 rounded-lg border border-[#0071e3]/20 bg-[#f2f8ff] p-3 text-sm">
                <div className="font-semibold text-[#0071e3]">已选择：{selectedMaterial.title}</div>
                <div className="mt-1 text-xs text-[#6e6e73]">{selectedMaterial.id}</div>
              </div>
            ) : null}
            <Field label="处理说明">
              <textarea
                className="min-h-36 w-full resize-none rounded-lg border border-black/10 bg-[#f5f5f7] p-3 text-sm leading-6 outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <button
              className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50"
              disabled={isRunning}
              onClick={createTask}
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isRunning ? "创建中" : "上传并增强"}
            </button>
            {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          </Panel>

          <Panel title="进度">
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-black/15 bg-[#fbfbfd] p-8 text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2f8ff] text-[#0071e3]">
                  {task ? <BadgeCheck size={24} /> : <Video size={24} />}
                </div>
                <div className="mt-4 text-sm font-semibold">{task ? `任务 ${task.status}` : "等待上传素材"}</div>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#86868b]">
                  {task ? "Worker 完成后可通过工具任务详情接口查看 output_url。" : "创建任务后会展示队列状态、消耗积分和后端任务 ID。"}
                </p>
              </div>
            </div>
          </Panel>
        </main>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">{label}{children}</label>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof ImageUp; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f5f5f7] px-3 py-3">
      <div className="flex items-center gap-2 text-xs text-[#86868b]">
        <Icon size={14} className="text-[#0071e3]" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
