"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Captions,
  FileVideo,
  ImageUp,
  Layers3,
  Loader2,
  Scissors,
  Wand2,
} from "lucide-react";

const toolConfig = {
  "subtitle-erase": {
    title: "字幕擦除",
    group: "视频处理",
    icon: Captions,
    desc: "擦除硬字幕、旧促销文字、直播间贴片和干扰型信息，输出干净素材。",
    primaryLabel: "创建字幕擦除任务",
    promptLabel: "擦除目标",
    placeholder: "例如：擦除底部双语字幕，保留人物和商品，不破坏背景纹理",
    presets: ["底部字幕", "全屏贴片", "口播字幕", "促销角标"],
  },
  "watermark-remove": {
    title: "去水印",
    group: "视频处理",
    icon: Scissors,
    desc: "用于自有素材、授权素材的水印清理和画面修复，默认保留合规提示。",
    primaryLabel: "创建去水印任务",
    promptLabel: "修复说明",
    placeholder: "例如：清理右上角旧品牌标识，补全墙面纹理",
    presets: ["角落水印", "半透明水印", "滚动贴片", "旧品牌标识"],
  },
  "viral-remix": {
    title: "爆款裂变",
    group: "AI 创作",
    icon: Layers3,
    desc: "从一个商品卖点或脚本扩展出多套钩子、镜头、标题和转化口播。",
    primaryLabel: "生成裂变方案",
    promptLabel: "原始脚本 / 卖点",
    placeholder: "粘贴已有视频脚本，或输入商品卖点、目标人群、平台",
    presets: ["痛点钩子", "测评钩子", "反差钩子", "场景钩子"],
  },
  "prompt-reverse": {
    title: "反推提示词",
    group: "Prompt 工具",
    icon: ImageUp,
    desc: "从图片或视频画面反推出模型提示词，沉淀为可复用创作模板。",
    primaryLabel: "反推提示词",
    promptLabel: "画面描述 / 素材链接",
    placeholder: "粘贴图片/视频链接，或描述画面主体、风格、镜头和光线",
    presets: ["商品主图", "达人口播", "生活方式", "广告海报"],
  },
  "video-prompt": {
    title: "视频提示词",
    group: "Prompt 工具",
    icon: FileVideo,
    desc: "把商品卖点转成视频模型可执行的镜头提示词，含角色、动作、背景、声音。",
    primaryLabel: "生成视频提示词",
    promptLabel: "商品 brief",
    placeholder: "例如：便携榨汁杯，一键清洗，面向 TikTok 美国健身人群",
    presets: ["单镜头", "三镜头", "长视频多镜头", "直播切片"],
  },
} as const;

type ToolKey = keyof typeof toolConfig;

const fallbackKey: ToolKey = "video-prompt";

export default function ToolDetailPage() {
  const params = useParams<{ toolKey: string }>();
  const key = (params.toolKey in toolConfig ? params.toolKey : fallbackKey) as ToolKey;
  const config = toolConfig[key];
  const Icon = config.icon;
  const [asset, setAsset] = useState("");
  const [prompt, setPrompt] = useState<string>(config.placeholder);
  const [preset, setPreset] = useState<string>(config.presets[0]);
  const [ratio, setRatio] = useState("9:16");
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  const preview = useMemo(() => {
    return [
      `工具：${config.title}`,
      `预设：${preset}`,
      `比例：${ratio}`,
      asset ? `素材：${asset}` : "素材：待上传或粘贴链接",
      `目标：${prompt}`,
    ].join("\n");
  }, [asset, config.title, preset, prompt, ratio]);

  const runTask = () => {
    setStatus("running");
    window.setTimeout(() => setStatus("done"), 900);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]" href="/tools">
        <ArrowLeft size={16} />
        返回工具箱
      </Link>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e8f2ff] text-[#0071e3]">
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">{config.group}</p>
              <h1 className="mt-2 text-4xl font-semibold">{config.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">{config.desc}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase text-[#6e6e73]">
              素材链接 / 素材 ID
              <input
                name="asset"
                className="h-11 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white"
                value={asset}
                onChange={(event) => setAsset(event.target.value)}
                placeholder="粘贴素材链接或素材 ID"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-[#6e6e73]">
              输出比例
              <select
                name="ratio"
                className="h-11 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white"
                value={ratio}
                onChange={(event) => setRatio(event.target.value)}
              >
                <option>9:16</option>
                <option>16:9</option>
                <option>1:1</option>
                <option>4:5</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {config.presets.map((item) => (
              <button
                key={item}
                className={`h-10 rounded-full border px-4 text-sm font-semibold ${
                  preset === item ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/10 bg-white text-[#1d1d1f]"
                }`}
                onClick={() => setPreset(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="mt-5 grid gap-1 text-xs font-semibold uppercase text-[#6e6e73]">
            {config.promptLabel}
            <textarea
              name="prompt"
              className="min-h-44 resize-none rounded-lg border border-black/10 bg-[#f5f5f7] p-3 text-sm leading-6 outline-none focus:border-[#0071e3] focus:bg-white"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>

          <button
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.3)]"
            onClick={runTask}
          >
            {status === "running" ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {status === "running" ? "处理中" : config.primaryLabel}
          </button>
        </div>

        <aside className="h-fit rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
          <div className="text-sm font-semibold">任务预览</div>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-white/10 p-4 text-xs leading-6 text-white/75">{preview}</pre>
          <div className="mt-4 rounded-lg bg-white/10 p-4 text-xs leading-6 text-white/70">
            {status === "done" ? "已生成本地预览。后续接入真实处理 API 后，这里会展示输出文件、进度和消耗积分。" : "当前为产品化任务面板，保留 DA 类工具流程和参数结构。"}
          </div>
        </aside>
      </section>
    </div>
  );
}
