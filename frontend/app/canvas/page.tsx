"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Brush,
  Film,
  Grid2X2,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Palette,
  Plus,
  RectangleHorizontal,
  Sparkles,
  Square,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type CanvasItem = {
  id: string;
  title: string;
  width: number;
  height: number;
  background_color: string;
  thumbnail_url?: string | null;
  status?: string;
  created_at: string;
};

type CanvasTemplate = {
  key: string;
  title: string;
  desc: string;
  width: number;
  height: number;
  background_color: string;
  icon: typeof Film;
  useCase: string;
};

const templates: CanvasTemplate[] = [
  {
    key: "tiktok-cover",
    title: "竖版带货封面",
    desc: "9:16 视频封面、短视频切片、商品钩子页",
    width: 1080,
    height: 1920,
    background_color: "#ffffff",
    icon: Film,
    useCase: "TikTok / Douyin",
  },
  {
    key: "product-card",
    title: "商品主图",
    desc: "1:1 电商主图、卖点卡片、广告首图",
    width: 1200,
    height: 1200,
    background_color: "#f5f5f7",
    icon: ImageIcon,
    useCase: "Shop / Ads",
  },
  {
    key: "storyboard",
    title: "分镜板",
    desc: "多镜头脚本可视化，适合长视频编排",
    width: 1920,
    height: 1080,
    background_color: "#111111",
    icon: RectangleHorizontal,
    useCase: "Long Video",
  },
  {
    key: "community-poster",
    title: "发现海报",
    desc: "社区作品封面、模板展示、案例沉淀",
    width: 1080,
    height: 1350,
    background_color: "#f2f8ff",
    icon: Square,
    useCase: "Discover",
  },
];

const backgroundSwatches = ["#ffffff", "#f5f5f7", "#f2f8ff", "#111111", "#fff7ed"];

export default function CanvasHomePage() {
  const router = useRouter();
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedKey, setSelectedKey] = useState(templates[0].key);
  const [customTitle, setCustomTitle] = useState("");
  const [background, setBackground] = useState(templates[0].background_color);
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => templates.find((item) => item.key === selectedKey) ?? templates[0], [selectedKey]);
  const stats = useMemo(() => {
    const vertical = items.filter((item) => item.height > item.width).length;
    const square = items.filter((item) => item.height === item.width).length;
    return { total: items.length, vertical, square };
  }, [items]);

  useEffect(() => {
    apiClient.get<CanvasItem[]>("/canvases").then(setItems).catch((err) => setError(err instanceof Error ? err.message : "画布加载失败"));
  }, []);

  useEffect(() => {
    setBackground(selected.background_color);
    setCustomTitle(selected.title);
  }, [selected]);

  const createCanvas = async (template = selected) => {
    setError(null);
    setCreating(true);
    try {
      const payload = {
        title: customTitle.trim() || template.title,
        width: template.width,
        height: template.height,
        background_color: background,
      };
      const created = await apiClient.post<CanvasItem>("/canvases", payload);
      setItems((next) => [created, ...next]);
      router.push(`/canvas/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画布创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="grid gap-5 rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl xl:grid-cols-[1fr_340px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Canvas Studio</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">画布</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
            对齐 DA 的画布一级入口：从模板开始，把 AI 图片、视频分镜、商品卖点和社区作品包装成可复用创意资产。
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="全部画布" value={`${stats.total}`} />
            <Metric label="竖版项目" value={`${stats.vertical}`} />
            <Metric label="方图项目" value={`${stats.square}`} />
          </div>
        </div>
        <div className="rounded-lg bg-[#1d1d1f] p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Layers3 size={18} className="text-[#0a84ff]" />
            推荐工作流
          </div>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            <Workflow text="AI 图片生成商品主体" />
            <Workflow text="画布叠加标题、卖点和 CTA" />
            <Workflow text="导出后进入视频或发现社区" />
          </div>
          <div className="mt-5 flex gap-2">
            <Link className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1d1d1f]" href="/image">
              先生成图片
              <ArrowUpRight size={15} />
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" href="/assets">
              选素材
            </Link>
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">模板开始</h2>
              <p className="mt-1 text-xs text-[#86868b]">选择尺寸和用途，一键创建后进入可拖拽编辑器。</p>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={isCreating} onClick={() => createCanvas()}>
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              创建
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => {
              const Icon = template.icon;
              const isActive = selectedKey === template.key;
              return (
                <button
                  key={template.key}
                  className={`group rounded-lg border p-4 text-left transition ${
                    isActive ? "border-[#0071e3] bg-[#f2f8ff] shadow-[0_14px_36px_rgba(0,113,227,0.14)]" : "border-black/10 bg-white hover:bg-[#fbfbfd]"
                  }`}
                  onClick={() => setSelectedKey(template.key)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-lg ${isActive ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#0071e3]"}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="font-semibold">{template.title}</div>
                        <div className="mt-1 text-xs text-[#86868b]">{template.useCase}</div>
                      </div>
                    </div>
                    <div className="rounded-full bg-[#f5f5f7] px-2 py-1 text-xs text-[#6e6e73]">
                      {template.width}x{template.height}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#6e6e73]">{template.desc}</p>
                  <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-[#f5f5f7] p-3">
                    <div
                      className="mx-auto rounded-md border border-black/10 shadow-sm"
                      style={{
                        width: template.width > template.height ? "78%" : template.width === template.height ? "42%" : "34%",
                        aspectRatio: `${template.width} / ${template.height}`,
                        background: template.background_color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <aside className="grid h-fit gap-4">
          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
            <h2 className="text-sm font-semibold">创建设置</h2>
            <label className="mt-4 grid gap-2 text-xs font-semibold text-[#86868b]">
              标题
              <input
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-normal text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                value={customTitle}
                maxLength={120}
                onChange={(event) => setCustomTitle(event.target.value)}
              />
            </label>
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#86868b]">
                <Palette size={14} />
                背景
              </div>
              <div className="flex flex-wrap gap-2">
                {backgroundSwatches.map((color) => (
                  <button
                    key={color}
                    className={`h-9 w-9 rounded-full border ${background === color ? "border-[#0071e3] ring-4 ring-[#0071e3]/10" : "border-black/10"}`}
                    style={{ background: color }}
                    onClick={() => setBackground(color)}
                    aria-label={`背景 ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#f5f5f7] p-3 text-sm">
              <div className="font-semibold">{selected.width} x {selected.height}</div>
              <div className="mt-1 text-xs text-[#86868b]">4K 上限内，可进入编辑器继续加文字、矩形、圆形和图片。</div>
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
            <h2 className="text-sm font-semibold">能力覆盖</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Capability icon={Brush} text="拖拽编辑元素" />
              <Capability icon={Layers3} text="图层排序与显隐锁定" />
              <Capability icon={Grid2X2} text="多尺寸创作模板" />
              <Capability icon={Sparkles} text="导出为可投放素材" />
            </div>
          </section>
        </aside>
      </section>

      <section className="mt-5 rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">最近画布</h2>
          <span className="text-xs text-[#86868b]">点击继续编辑</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-black/15 p-6 text-sm text-[#86868b]">还没有画布，选择一个模板开始。</div>
          ) : null}
          {items.map((item) => (
            <Link key={item.id} className="group overflow-hidden rounded-lg border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]" href={`/canvas/${item.id}`}>
              <div className="grid aspect-[9/12] place-items-center bg-[#f5f5f7] p-5">
                {item.thumbnail_url ? (
                  <img className="h-full w-full rounded-md object-cover" src={item.thumbnail_url} alt={item.title} />
                ) : (
                  <div
                    className="rounded-md border border-black/10 shadow-sm"
                    style={{
                      width: item.width > item.height ? "88%" : item.width === item.height ? "66%" : "45%",
                      aspectRatio: `${item.width} / ${item.height}`,
                      background: item.background_color,
                    }}
                  />
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{item.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-[#86868b]">
                  <span>{item.width}x{item.height}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f5f5f7] px-3 py-3">
      <div className="text-xs text-[#86868b]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Workflow({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2">
      {text}
    </div>
  );
}

function Capability({ icon: Icon, text }: { icon: typeof Brush; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#f5f5f7] px-3 py-3">
      <Icon size={16} className="text-[#0071e3]" />
      {text}
    </div>
  );
}
