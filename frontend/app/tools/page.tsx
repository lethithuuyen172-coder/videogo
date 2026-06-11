"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Captions,
  FileVideo,
  ImageUp,
  Layers3,
  Loader2,
  Scissors,
  Sparkles,
  Wand2,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type ToolItem = {
  tool_key: string;
  name: string;
  status: string;
  credit_cost: number;
};

const toolMeta: Record<string, { group: string; desc: string; icon: typeof Wand2; href?: string }> = {
  enhance: {
    group: "视频处理",
    desc: "提升素材分辨率、帧率、清晰度和降噪效果。",
    icon: Sparkles,
    href: "/tools/enhance",
  },
  "subtitle-erase": {
    group: "视频处理",
    desc: "擦除硬字幕、旧促销文字和干扰型贴片。",
    icon: Captions,
    href: "/tools/subtitle-erase",
  },
  "watermark-remove": {
    group: "视频处理",
    desc: "合规场景下清理自有素材水印和平台标记。",
    icon: Scissors,
    href: "/tools/watermark-remove",
  },
  "viral-remix": {
    group: "爆款裂变",
    desc: "从一条脚本扩展出多套角度、钩子和分镜。",
    icon: Layers3,
    href: "/tools/viral-remix",
  },
  "prompt-reverse": {
    group: "Prompt 工具",
    desc: "从图片或视频画面反推出可复用提示词结构。",
    icon: ImageUp,
    href: "/tools/prompt-reverse",
  },
  "video-prompt": {
    group: "Prompt 工具",
    desc: "把商品卖点改写成视频模型可执行镜头提示词。",
    icon: FileVideo,
    href: "/tools/video-prompt",
  },
};

const fallbackTools: ToolItem[] = [
  { tool_key: "enhance", name: "画质增强", status: "available", credit_cost: 30 },
  { tool_key: "subtitle-erase", name: "字幕擦除", status: "coming_soon", credit_cost: 0 },
  { tool_key: "watermark-remove", name: "去水印", status: "coming_soon", credit_cost: 0 },
  { tool_key: "viral-remix", name: "爆款裂变", status: "coming_soon", credit_cost: 0 },
  { tool_key: "prompt-reverse", name: "反推提示词", status: "coming_soon", credit_cost: 0 },
  { tool_key: "video-prompt", name: "视频提示词", status: "coming_soon", credit_cost: 0 },
];

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolItem[]>(fallbackTools);
  const [activeKey, setActiveKey] = useState("enhance");
  const [prompt, setPrompt] = useState("便携榨汁杯，真实测评风格，面向 TikTok 美国用户");
  const [assetUrl, setAssetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const activeTool = tools.find((tool) => tool.tool_key === activeKey) ?? tools[0];
  const activeMeta = toolMeta[activeTool.tool_key] ?? toolMeta.enhance;

  useEffect(() => {
    apiClient.get<ToolItem[]>("/tools").then((items) => {
      const merged = items.length ? items : fallbackTools;
      setTools(merged);
      if (!merged.some((item) => item.tool_key === activeKey)) setActiveKey(merged[0].tool_key);
    }).catch(() => setTools(fallbackTools));
  }, []);

  const groups = useMemo(() => {
    return tools.reduce<Record<string, ToolItem[]>>((acc, tool) => {
      const group = toolMeta[tool.tool_key]?.group ?? "其他";
      acc[group] = [...(acc[group] ?? []), tool];
      return acc;
    }, {});
  }, [tools]);

  const simulateRun = () => {
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 900);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Toolbox</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">工具箱</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              覆盖视频后处理、爆款裂变、反推提示词和视频提示词生成，保持 DA 类工具入口完整，同时围绕带货素材链路优化。
            </p>
          </div>
          <div className="rounded-full bg-[#e8f2ff] px-4 py-2 text-sm font-semibold text-[#0071e3]">
            {tools.length} 个工具入口
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
              <div className="mb-3 text-sm font-semibold text-[#6e6e73]">{group}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((tool) => {
                  const meta = toolMeta[tool.tool_key] ?? toolMeta.enhance;
                  const Icon = meta.icon;
                  const selected = activeKey === tool.tool_key;
                  return (
                    <div
                      key={tool.tool_key}
                      role="button"
                      tabIndex={0}
                      className={`h-full rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#0071e3] bg-[#f2f8ff] shadow-[0_10px_24px_rgba(0,113,227,0.12)]"
                          : "border-black/10 bg-white hover:bg-[#f5f5f7]"
                      }`}
                      onClick={() => setActiveKey(tool.tool_key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") setActiveKey(tool.tool_key);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f7] text-[#0071e3]">
                          <Icon size={18} />
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tool.status === "available" ? "bg-[#e7f8ee] text-[#248a3d]" : "bg-[#f5f5f7] text-[#86868b]"}`}>
                          {tool.status === "available" ? "可用" : "即将上线"}
                        </span>
                      </div>
                      <div className="mt-4 text-base font-semibold">{tool.name}</div>
                      <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{meta.desc}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold">
                        <span className="text-[#86868b]">{tool.credit_cost} 积分</span>
                        {meta.href ? (
                          <Link className="text-[#0071e3]" href={meta.href} onClick={(event) => event.stopPropagation()}>
                            打开专页
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className="sticky top-4 h-fit rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck size={18} className="text-[#0a84ff]" />
            当前工具
          </div>
          <h2 className="mt-3 text-2xl font-semibold">{activeTool.name}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{activeMeta.desc}</p>
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-white/70">
              素材链接 / 素材 ID
              <input
                id="tool-asset-url"
                name="tool-asset-url"
                className="h-11 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none focus:border-[#0a84ff]"
                value={assetUrl}
                onChange={(event) => setAssetUrl(event.target.value)}
                placeholder="粘贴视频、图片或素材 ID"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-white/70">
              处理目标 / 提示词
              <textarea
                id="tool-prompt"
                name="tool-prompt"
                className="min-h-28 rounded-lg border border-white/10 bg-white/10 p-3 text-sm leading-6 text-white outline-none focus:border-[#0a84ff]"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.3)]"
              onClick={simulateRun}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {activeTool.status === "available" ? "创建任务" : "加入需求队列"}
            </button>
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-3 text-xs leading-6 text-white/70">
            {activeTool.status === "available"
              ? "该工具已有后端任务接口，可继续接入上传素材和队列轮询。"
              : "该入口先保留完整产品面，后续逐步接入真实处理能力。"}
          </div>
        </aside>
      </section>
    </div>
  );
}
