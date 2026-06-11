"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Braces,
  CirclePlay,
  Copy,
  Film,
  Layers3,
  Mic2,
  RefreshCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type ProviderModel = {
  model_id: string;
  name: string;
  status: string;
  credit_cost: number;
};

type Shot = {
  id: number;
  title: string;
  role: string;
  action: string;
  style: string;
  camera: string;
  background: string;
  sound: string;
  memory: string;
};

type VideoJob = {
  id: string;
  status: string;
  progress: number;
  output_url?: string;
};

const archetypes = [
  "真实测评",
  "故事种草",
  "工厂溯源",
  "达人连续剧",
  "痛点改造",
] as const;

const defaultShots: Shot[] = [
  {
    id: 1,
    title: "问题开场",
    role: "同一位真实测评型达人，干净自然妆，浅色针织衫，声音清晰可信",
    action: "达人展示忙碌早晨的混乱桌面，说出用户痛点，并拿起产品作为解决方案",
    style: "真实 UGC 带货，生活化但画质干净，节奏克制",
    camera: "手持中近景，轻微推进到产品特写",
    background: "晨光厨房，桌面有水果、早餐、手机和待处理清单",
    sound: "环境房间声，轻快低音量 BGM，产品拿起时有轻微触碰声",
    memory: "锁定达人脸型、服装、声音音色和厨房色调",
  },
  {
    id: 2,
    title: "核心演示",
    role: "同一位达人保持相同服装和声音，手部动作清晰",
    action: "把水果和水加入产品，一键启动，解释第一个核心卖点",
    style: "产品演示清楚，突出真实操作，没有夸张特效",
    camera: "俯拍切到产品侧面特写，再回到达人半身",
    background: "同一厨房台面，产品居中，背景保持轻微虚化",
    sound: "机器工作声、按键声、连续稳定的解说声",
    memory: "延续产品外观比例、杯身颜色和达人手部动作习惯",
  },
  {
    id: 3,
    title: "场景迁移",
    role: "同一位达人带着产品走到办公桌，声音音色不变",
    action: "展示产品可携带，放进通勤包，再在办公室取出使用",
    style: "短剧化转场，节奏比前一镜头更快",
    camera: "跟拍转场到固定桌面镜头",
    background: "办公室茶水区和工位，光线偏冷但干净",
    sound: "脚步声、包链声、办公室低频环境声，BGM 保持同一旋律",
    memory: "保持角色身份连续，产品尺寸和颜色不漂移",
  },
  {
    id: 4,
    title: "证据强化",
    role: "同一位达人用更靠近镜头的语气解释细节",
    action: "拆解清洗步骤、容量、续航或安全设计，用手势指向关键部位",
    style: "测评感强，信息密度提升，字幕感画面构图",
    camera: "稳定近景，穿插微距产品细节",
    background: "干净桌面，旁边摆放对比物增强尺度感",
    sound: "水流声、旋拧声、产品盖合声，解说声清晰靠前",
    memory: "延续品牌视觉和产品细节，避免按钮/接口位置变化",
  },
  {
    id: 5,
    title: "用户想象",
    role: "同一位达人笑容更放松，声音更轻快",
    action: "展示健身后、露营、宿舍或办公室等多个使用瞬间",
    style: "生活方式蒙太奇，画面更明亮",
    camera: "三段快速切镜，每段保持产品在画面中心",
    background: "健身包、户外桌、宿舍书桌等真实消费场景",
    sound: "轻快 BGM 稍微上扬，保留真实环境声",
    memory: "角色与产品贯穿所有场景，声音和产品外观稳定",
  },
  {
    id: 6,
    title: "转化收口",
    role: "同一位达人回到厨房，直视镜头，语气明确",
    action: "总结三个卖点，给出限时优惠或购买动作，引导点击购物车",
    style: "直接转化，可信、利落、不喊麦",
    camera: "固定正面中景，最后推近到产品和手势",
    background: "回到第一镜头厨房，形成首尾呼应",
    sound: "BGM 收束，达人声音靠前，结尾有轻微提示音",
    memory: "回收第一镜头的角色、厨房、产品状态，形成完整故事闭环",
  },
];

export default function LongVideoPage() {
  const [productName, setProductName] = useState("便携榨汁杯");
  const [audience, setAudience] = useState("TikTok 美国 25-40 岁通勤和健身人群");
  const [sellingPoints, setSellingPoints] = useState("一键清洗, 轻便可携带, 10秒出杯, 适合早餐和健身后");
  const [brandTone, setBrandTone] = useState("真实测评，不夸张，像朋友推荐");
  const [archetype, setArchetype] = useState<(typeof archetypes)[number]>("真实测评");
  const [shots, setShots] = useState<Shot[]>(defaultShots);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [modelId, setModelId] = useState("joyai-echo-longvideo");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState("");
  const totalSeconds = shots.length * 8;

  const promptJson = useMemo(() => {
    const points = sellingPoints
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join("、");
    return JSON.stringify(
      {
        product: productName,
        audience,
        long_video_logic: "multi-shot story, paired visual/audio memory, consistent character/product identity",
        prompts: shots.map((shot, index) =>
          [
            `Shot ${index + 1}: ${shot.title}.`,
            `Product: ${productName}. Selling points: ${points}. Target audience: ${audience}. Brand tone: ${brandTone}.`,
            `Roles & Subjects: ${shot.role}.`,
            `Action & Dialogue: ${shot.action}. Mention the product naturally and keep the commerce message useful.`,
            `Style: ${shot.style}. Archetype: ${archetype}.`,
            `Camera Movement: ${shot.camera}.`,
            `Background: ${shot.background}.`,
            `Sound Effects & BGM: ${shot.sound}.`,
            `Memory Continuity: ${shot.memory}. Keep the same product shape, character face, wardrobe, voice timbre, and color palette across shots.`,
          ].join(" "),
        ),
      },
      null,
      2,
    );
  }, [archetype, audience, brandTone, productName, sellingPoints, shots]);

  const loadModels = async () => {
    setIsLoadingModels(true);
    setError("");
    try {
      const items = await apiClient.get<ProviderModel[]>("/videos/models");
      setModels(items);
      const preferred = items.find((item) => item.model_id === "joyai-echo-longvideo")
        ?? items.find((item) => item.status === "configured" || item.status === "available");
      if (preferred) setModelId(preferred.model_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模型列表加载失败");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const regenerateShots = () => {
    const tone = archetype === "工厂溯源" ? "增加生产、质检和材质可信度" : archetype === "故事种草" ? "增强角色情绪和前后反差" : "强化真实使用和转化";
    setShots((current) =>
      current.map((shot, index) => ({
        ...shot,
        action: `${shot.action}。本镜头额外要求：${tone}，自然露出「${productName}」。`,
        memory: `${shot.memory}；第 ${index + 1} 镜头必须继承前面镜头的产品和声音记忆。`,
      })),
    );
  };

  const updateShot = (id: number, key: keyof Shot, value: string) => {
    setShots((current) => current.map((shot) => (shot.id === id ? { ...shot, [key]: value } : shot)));
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(promptJson);
  };

  const submitVideo = async () => {
    setIsSubmitting(true);
    setError("");
    setJob(null);
    try {
      const result = await apiClient.post<VideoJob>("/videos/run-direct", {
        prompt: promptJson,
        model_id: modelId,
        duration_seconds: Math.min(300, Math.max(4, totalSeconds)),
        aspect_ratio: "9:16",
        resolution: "720p",
      });
      setJob(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "长视频任务提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">JoyAI-Echo logic for commerce</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                长视频带货编排台
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
                用多镜头 prompt、角色记忆、声音记忆和商品一致性，把短视频卖点扩成可连续生成的长视频故事。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              <Metric label="镜头" value={shots.length.toString()} />
              <Metric label="预计" value={`${totalSeconds}s`} />
              <Metric label="比例" value="9:16" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="商品">
              <input className="field-input" value={productName} onChange={(event) => setProductName(event.target.value)} />
            </Field>
            <Field label="目标人群">
              <input className="field-input" value={audience} onChange={(event) => setAudience(event.target.value)} />
            </Field>
            <Field label="卖点">
              <input className="field-input" value={sellingPoints} onChange={(event) => setSellingPoints(event.target.value)} />
            </Field>
            <Field label="表达口吻">
              <input className="field-input" value={brandTone} onChange={(event) => setBrandTone(event.target.value)} />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {archetypes.map((item) => (
              <button
                key={item}
                className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                  archetype === item
                    ? "border-[#0071e3] bg-[#0071e3] text-white shadow-[0_8px_20px_rgba(0,113,227,0.24)]"
                    : "border-black/10 bg-white/70 text-[#1d1d1f] hover:bg-white"
                }`}
                onClick={() => setArchetype(item)}
              >
                {item}
              </button>
            ))}
            <button className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3] shadow-sm transition hover:bg-[#f5f5f7]" onClick={regenerateShots}>
              <RefreshCcw size={16} />
              重排镜头
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.14)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck size={18} />
            生成通道
          </div>
          <button
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
            onClick={loadModels}
            disabled={isLoadingModels}
          >
            <Layers3 size={16} />
            {isLoadingModels ? "加载中" : "刷新模型"}
          </button>
          <select className="mt-3 h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white outline-none" value={modelId} onChange={(event) => setModelId(event.target.value)}>
            <option value="joyai-echo-longvideo">JoyAI-Echo LongVideo</option>
            {models.map((model) => (
              <option key={model.model_id} value={model.model_id}>
                {model.name} · {model.status}
              </option>
            ))}
          </select>
          <button
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.3)] transition hover:bg-[#0077ed] disabled:opacity-60"
            onClick={submitVideo}
            disabled={isSubmitting || !modelId}
          >
            <CirclePlay size={18} />
            {isSubmitting ? "提交中" : "提交长视频"}
          </button>
          {job ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/10 p-3 text-xs leading-6">
              <div>任务：{job.id}</div>
              <div>状态：{job.status} / {job.progress}%</div>
              {job.output_url ? <a className="underline" href={job.output_url} target="_blank">打开视频</a> : null}
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-[#ff9f0a]">{error}</p> : null}
          <div className="mt-5 grid gap-3 border-t border-white/20 pt-4 text-xs leading-5 text-white/80">
            <Logic icon={Film} title="多镜头" text="每条 prompt 是完整镜头，不依赖上一条文本补全。" />
            <Logic icon={Mic2} title="角色与声音记忆" text="每个镜头重复锁定外貌、服装、音色和产品形态。" />
            <Logic icon={Volume2} title="音画同步" text="动作、台词、环境声和 BGM 写在同一镜头内。" />
          </div>
        </aside>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3">
          {shots.map((shot, index) => (
            <article key={shot.id} className="grid gap-3 rounded-lg border border-black/10 bg-white/85 p-3 shadow-[0_10px_34px_rgba(0,0,0,0.05)] backdrop-blur md:grid-cols-[92px_minmax(0,1fr)]">
              <div className="rounded-lg bg-[#f5f5f7] p-3 text-center">
                <div className="text-xs font-semibold uppercase text-[#86868b]">Shot</div>
                <div className="text-3xl font-semibold text-[#0071e3]">{index + 1}</div>
                <div className="mt-2 text-xs font-semibold text-[#1d1d1f]">{shot.title}</div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <ShotField label="角色主体" value={shot.role} onChange={(value) => updateShot(shot.id, "role", value)} />
                <ShotField label="动作台词" value={shot.action} onChange={(value) => updateShot(shot.id, "action", value)} />
                <ShotField label="风格" value={shot.style} onChange={(value) => updateShot(shot.id, "style", value)} />
                <ShotField label="镜头运动" value={shot.camera} onChange={(value) => updateShot(shot.id, "camera", value)} />
                <ShotField label="背景" value={shot.background} onChange={(value) => updateShot(shot.id, "background", value)} />
                <ShotField label="声音/BGM" value={shot.sound} onChange={(value) => updateShot(shot.id, "sound", value)} />
                <div className="lg:col-span-2">
                  <ShotField label="记忆锚点" value={shot.memory} onChange={(value) => updateShot(shot.id, "memory", value)} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="sticky top-4 h-fit overflow-hidden rounded-lg border border-black/10 bg-[#1d1d1f] text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between border-b border-white/10 p-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Braces size={18} />
              JoyAI prompt JSON
            </div>
            <button className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 px-3 text-xs font-semibold transition hover:bg-white hover:text-[#1d1d1f]" onClick={copyPrompt}>
              <Copy size={14} />
              复制
            </button>
          </div>
          <pre className="max-h-[720px] overflow-auto p-3 text-[11px] leading-5 text-[#d7e8ff]">
            {promptJson}
          </pre>
        </aside>
      </section>

      <style jsx>{`
        .field-input {
          height: 42px;
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.88);
          padding: 0 12px;
          font-size: 13px;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .field-input:focus {
          border-color: #0071e3;
          background: white;
          box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
        }
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
      <div className="text-[10px] text-[#86868b]">{label}</div>
      <div className="text-lg font-semibold text-[#1d1d1f]">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-[#6e6e73]">
      {label}
      {children}
    </label>
  );
}

function ShotField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[#6e6e73]">
      {label}
      <textarea
        className="min-h-20 resize-none rounded-lg border border-black/10 bg-[#f5f5f7] p-3 text-sm font-normal leading-5 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.14)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Logic({ icon: Icon, title, text }: { icon: typeof Sparkles; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-2">
      <Icon size={18} className="mt-0.5 text-[#0a84ff]" />
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div>{text}</div>
      </div>
    </div>
  );
}
