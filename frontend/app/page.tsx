"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  AtSign,
  Boxes,
  Brush,
  CircleDollarSign,
  FileUp,
  Image as ImageIcon,
  MessageSquareText,
  Scissors,
  Send,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type SubjectMaterial = {
  id: string;
  title: string;
  material_type: string;
  url?: string | null;
  is_subject?: boolean;
};

const modes = [
  { key: "agent", label: "Agent", href: "/chat", icon: MessageSquareText },
  { key: "video", label: "AI 视频", href: "/video", icon: Video },
  { key: "image", label: "AI 图片", href: "/image", icon: ImageIcon },
  { key: "canvas", label: "画布", href: "/canvas", icon: Brush },
];

const skillChips = [
  { label: "画质增强", href: "/tools/video-quality-enhance", desc: "提升视频清晰度、分辨率和观感。" },
  { label: "去水印", href: "/tools/video-watermark-remove", desc: "清理自有或授权素材中的固定水印。" },
  { label: "去字幕", href: "/tools/video-subtitle-erase", desc: "擦除硬字幕、贴片和旧促销文字。" },
  { label: "爆款裂变", href: "/tools/hot-video-remix", desc: "把一条素材扩展成多套带货变体。" },
];

const creationFlows = [
  {
    href: "/chat",
    icon: MessageSquareText,
    title: "AI Agent 对话",
    desc: "输入商品、脚本、广告目标，由 Agent 拆解创作任务。",
    accent: "bg-[#0071e3]",
  },
  {
    href: "/video",
    icon: Video,
    title: "AI 视频生成",
    desc: "支持文生视频、模型选择、同步生成和队列任务。",
    accent: "bg-[#ff9f0a]",
  },
  {
    href: "/long-video",
    icon: Sparkles,
    title: "长视频编排",
    desc: "多镜头 prompt、角色记忆、声音记忆和产品一致性。",
    accent: "bg-[#af52de]",
  },
  {
    href: "/image",
    icon: ImageIcon,
    title: "AI 图片生成",
    desc: "商品图、海报图、参考图扩展和多比例出图。",
    accent: "bg-[#34c759]",
  },
  {
    href: "/canvas",
    icon: Brush,
    title: "在线画布",
    desc: "模板化编辑封面、商品图、广告素材并导出。",
    accent: "bg-[#ff375f]",
  },
  {
    href: "/tools",
    icon: Scissors,
    title: "工具箱",
    desc: "画质增强、字幕擦除、去水印、爆款裂变、提示词工具。",
    accent: "bg-[#5856d6]",
  },
];

const pipeline = ["参考素材", "输入文字", "@主体", "Agent 拆解", "生成/处理", "资产沉淀"];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState(modes[0].key);
  const [prompt, setPrompt] = useState("帮我把一款 TikTok 带货商品做成高转化视频素材");
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectMaterialId, setSubjectMaterialId] = useState("");
  const [subjectMaterials, setSubjectMaterials] = useState<SubjectMaterial[]>([]);
  const [isSubjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [isSkillOpen, setSkillOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const activeMode = useMemo(() => modes.find((item) => item.key === mode) ?? modes[0], [mode]);

  useEffect(() => {
    apiClient
      .get<SubjectMaterial[]>("/materials?is_subject=true")
      .then(setSubjectMaterials)
      .catch(() => setSubjectMaterials([]));
  }, []);

  const buildContextQuery = () => {
    const normalizedPrompt = prompt.trim();
    const normalizedReference = reference.trim();
    const normalizedSubject = subject.trim();
    if (!normalizedPrompt) {
      setNotice("先输入一个创作需求");
      return null;
    }
    const params = new URLSearchParams();
    const nextPrompt = normalizedPrompt.slice(0, 2000);
    if (normalizedPrompt.length > 2000) setNotice("已截断到 2000 字后带入工作台");
    else setNotice("");
    if (nextPrompt.length > 1200 && typeof window !== "undefined") {
      const handoffId = `home-${Date.now()}`;
      sessionStorage.setItem(
        `videogo:create:${handoffId}`,
        JSON.stringify({
          prompt: nextPrompt,
          reference: normalizedReference,
          subject: normalizedSubject,
          subject_material_id: subjectMaterialId,
        }),
      );
      params.set("context_id", handoffId);
    } else {
      params.set("prompt", nextPrompt);
      if (normalizedReference) params.set("reference", normalizedReference);
      if (normalizedSubject) params.set("subject", normalizedSubject);
      if (subjectMaterialId) params.set("subject_material_id", subjectMaterialId);
    }
    if (!params.has("reference") && normalizedReference) params.set("reference", normalizedReference);
    if (!params.has("subject") && normalizedSubject) params.set("subject", normalizedSubject);
    if (!params.has("subject_material_id") && subjectMaterialId) params.set("subject_material_id", subjectMaterialId);
    return params.toString();
  };

  const launch = () => {
    const query = buildContextQuery();
    if (query === null) return;
    router.push(`${activeMode.href}?${query}`);
  };

  const launchSkill = (href: string) => {
    const query = buildContextQuery();
    if (query === null) return;
    router.push(`${href}?${query}`);
  };

  const previewQuery = () => {
    const params = new URLSearchParams();
    if (prompt.trim()) params.set("prompt", prompt.trim().slice(0, 2000));
    if (reference.trim()) params.set("reference", reference.trim());
    if (subject.trim()) params.set("subject", subject.trim());
    if (subjectMaterialId) params.set("subject_material_id", subjectMaterialId);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0071e3]">VideoGo Creative OS</p>
          <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            你想创作什么？
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#6e6e73]">
            从一个输入框开始，覆盖 AI 对话、视频、图片、画布、工具、资产和积分，并在带货转化链路上继续迭代。
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-4xl rounded-[28px] border border-black/10 bg-[#f5f5f7] p-3 shadow-inner">
          <div className="grid gap-2 md:grid-cols-2">
            <LabeledInput icon={FileUp} label="参考素材" value={reference} onChange={setReference} placeholder="粘贴商品图、视频、素材 ID 或竞品链接" />
            <label className="relative grid gap-1 rounded-[18px] bg-white px-4 py-3 text-xs text-[#86868b]">
              <span className="flex items-center gap-1 font-semibold text-[#1d1d1f]">
                <AtSign size={14} className="text-[#0071e3]" />
                @主体
              </span>
              <input
                className="bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                value={subject}
                placeholder="输入 @ 选择主体素材，或手动填写商品/角色"
                onFocus={() => setSubjectPickerOpen(subject.includes("@"))}
                onChange={(event) => {
                  const next = event.target.value;
                  setSubject(next);
                  setSubjectMaterialId("");
                  setSubjectPickerOpen(next.includes("@"));
                }}
              />
              {isSubjectPickerOpen ? (
                <div className="absolute left-0 right-0 top-[76px] z-20 max-h-64 overflow-auto rounded-lg border border-black/10 bg-white p-2 text-left shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
                  {subjectMaterials.length ? (
                    subjectMaterials.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[#f5f5f7]"
                        onClick={() => {
                          setSubject(item.title);
                          setSubjectMaterialId(item.id);
                          if (item.url) setReference(item.url);
                          setSubjectPickerOpen(false);
                        }}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#e8f2ff] text-[11px] font-semibold text-[#0071e3]">
                          {item.material_type}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#1d1d1f]">{item.title}</span>
                          <span className="block text-xs text-[#86868b]">{item.id}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg bg-[#f5f5f7] p-3 text-xs leading-5 text-[#6e6e73]">
                      暂无主体素材；可在资产中心把素材标记为主体，或继续手动填写。
                    </div>
                  )}
                </div>
              ) : null}
            </label>
          </div>
          <textarea
            className="mt-3 min-h-32 w-full resize-none rounded-[22px] border border-black/10 bg-white px-5 py-4 text-base outline-none transition placeholder:text-[#86868b] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
            value={prompt}
            maxLength={4000}
            placeholder="输入文字，或描述你要生成的视频、图片、脚本、画布..."
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                launch();
              }
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                    mode === item.key ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:text-[#1d1d1f]"
                  }`}
                  onClick={() => setMode(item.key)}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
            <button
              className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-[#1d1d1f]"
              onClick={() => setSkillOpen(true)}
            >
              选择技能
              <Scissors size={16} />
            </button>
            <button className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)]" onClick={launch}>
              开始
              <Send size={16} />
            </button>
          </div>
          {notice ? <div className="mt-3 rounded-lg bg-white px-3 py-2 text-left text-xs font-semibold text-[#bf5700]">{notice}</div> : null}
        </div>

        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2">
          {skillChips.map((item) => (
            <Link key={item.href} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#6e6e73] hover:border-[#0071e3] hover:text-[#0071e3]" href={`${item.href}${previewQuery()}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {isSkillOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="选择技能">
          <div className="w-full max-w-2xl rounded-lg border border-black/10 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">选择技能</h2>
                <p className="mt-1 text-sm text-[#6e6e73]">把当前输入直接带到指定工具工作台。</p>
              </div>
              <button className="rounded-full bg-[#f5f5f7] px-3 py-2 text-sm font-semibold text-[#6e6e73]" onClick={() => setSkillOpen(false)}>
                关闭
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {skillChips.map((item) => (
                <button
                  key={item.href}
                  className="rounded-lg border border-black/10 bg-[#f5f5f7] p-4 text-left transition hover:border-[#0071e3] hover:bg-white"
                  onClick={() => launchSkill(item.href)}
                >
                  <div className="text-sm font-semibold text-[#1d1d1f]">{item.label}</div>
                  <p className="mt-2 text-xs leading-5 text-[#6e6e73]">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {creationFlows.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                className="group rounded-lg border border-black/10 bg-white/85 p-5 shadow-[0_10px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]"
                href={item.href}
              >
                <div className={`grid h-11 w-11 place-items-center rounded-full text-white ${item.accent}`}>
                  <Icon size={20} />
                </div>
                <div className="mt-5 text-lg font-semibold">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{item.desc}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]">
                  打开模块
                  <WandSparkles size={16} className="transition group-hover:rotate-12" />
                </div>
              </Link>
            );
          })}
        </div>

        <aside className="grid h-fit gap-4">
          <section className="rounded-lg bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/72">
              <Boxes size={18} className="text-[#0a84ff]" />
              创作流水线
            </div>
            <div className="mt-4 grid gap-2">
              {pipeline.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-semibold text-[#1d1d1f]">
                    {index + 1}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
            <h2 className="text-sm font-semibold">商业闭环</h2>
            <div className="mt-3 grid gap-2">
              {[
                { href: "/assets", title: "资产中心", text: "沉淀素材和生成结果。" },
                { href: "/credits", title: "积分与充值", text: "额度、套餐和消耗记录。" },
                { href: "/discover", title: "发现社区", text: "作品流和可复刻模板。" },
              ].map((item) => (
                <Link key={item.href} className="rounded-lg bg-[#f5f5f7] p-3 text-sm" href={item.href}>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-2">
                      <CircleDollarSign size={15} className="text-[#0071e3]" />
                      {item.title}
                    </span>
                    <ArrowUpRight size={14} className="text-[#86868b]" />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{item.text}</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function LabeledInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof FileUp;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 rounded-[18px] bg-white px-4 py-3 text-xs text-[#86868b]">
      <span className="flex items-center gap-1 font-semibold text-[#1d1d1f]">
        <Icon size={14} className="text-[#0071e3]" />
        {label}
      </span>
      <input
        className="bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
