"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, FileVideo, Image as ImageIcon, Layers3, Loader2, Plus, RefreshCw, Send, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

type Work = {
  id: string;
  work_type: "video" | "image" | "canvas";
  title: string;
  description?: string | null;
  cover_url?: string | null;
  status: string;
  like_count: number;
  bookmark_count: number;
  created_at: string;
};

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string;
  status: string;
};

type CanvasItem = {
  id: string;
  title: string;
  width: number;
  height: number;
  thumbnail_url?: string | null;
  status: string;
  created_at: string;
};

const workTypes = [
  { label: "视频", value: "video", icon: FileVideo },
  { label: "图片", value: "image", icon: ImageIcon },
  { label: "画布", value: "canvas", icon: Layers3 },
] as const;

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [workType, setWorkType] = useState<Work["work_type"]>("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [canvasId, setCanvasId] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [isPublishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [myWorks, materialItems, canvasItems] = await Promise.all([
        apiClient.get<Work[]>("/community/my/works"),
        apiClient.get<Material[]>("/materials"),
        apiClient.get<CanvasItem[]>("/canvases"),
      ]);
      setWorks(myWorks);
      setMaterials(materialItems);
      setCanvases(canvasItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作品加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    const titleParam = params.get("title");
    const coverParam = params.get("cover");
    const descriptionParam = params.get("description");
    if (typeParam === "video" || typeParam === "image" || typeParam === "canvas") setWorkType(typeParam);
    if (titleParam) setTitle(titleParam.slice(0, 120));
    if (coverParam) setCoverUrl(coverParam);
    if (descriptionParam) setDescription(descriptionParam.slice(0, 500));
    void load();
  }, []);

  const filteredMaterials = useMemo(() => {
    if (workType === "canvas") return [];
    return materials.filter((item) => item.material_type === workType);
  }, [materials, workType]);

  const stats = useMemo(() => {
    return {
      total: works.length,
      published: works.filter((item) => item.status === "published").length,
      pending: works.filter((item) => item.status === "pending_review").length,
      engagement: works.reduce((sum, item) => sum + item.like_count + item.bookmark_count, 0),
    };
  }, [works]);

  const submit = async () => {
    setError(null);
    setNotice(null);
    setPublishing(true);
    try {
      const created = await apiClient.post<Work>("/community/works", {
        work_type: workType,
        title: title.trim(),
        description: description.trim() || undefined,
        material_id: workType === "canvas" || !materialId ? undefined : materialId,
        canvas_id: workType === "canvas" && canvasId ? canvasId : undefined,
        cover_url: coverUrl.trim() || undefined,
      });
      setWorks((items) => [created, ...items]);
      setTitle("");
      setDescription("");
      setCoverUrl("");
      setNotice("作品已提交审核，通过后会出现在发现流。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作品发布失败");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Creator Works</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">我的作品</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              把生成的视频、图片和画布发布到发现流，管理审核状态、封面、互动数据和后续复刻入口。
            </p>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3]" onClick={load} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            刷新
          </button>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric icon={Layers3} label="全部作品" value={`${stats.total}`} />
        <Metric icon={CheckCircle2} label="已发布" value={`${stats.published}`} />
        <Metric icon={Clock3} label="审核中" value={`${stats.pending}`} />
        <Metric icon={Sparkles} label="互动" value={`${stats.engagement}`} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Send size={17} className="text-[#0071e3]" />
            <h2 className="text-sm font-semibold">发布到发现</h2>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {workTypes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  className={`grid h-20 place-items-center rounded-lg border text-sm font-semibold ${
                    workType === item.value ? "border-[#0071e3] bg-[#f2f8ff] text-[#0071e3]" : "border-black/10 bg-[#f5f5f7] text-[#424245]"
                  }`}
                  onClick={() => {
                    setWorkType(item.value);
                    setMaterialId("");
                    setCanvasId("");
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 grid gap-1 text-xs font-semibold text-[#6e6e73]">
            标题
            <input className="control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：30秒 TikTok 爆款杯子测评" />
          </label>

          <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
            描述
            <textarea className="control min-h-24 resize-none py-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="补充卖点、场景、提示词或复刻说明" />
          </label>

          {workType === "canvas" ? (
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              选择画布
              <select className="control" value={canvasId} onChange={(event) => setCanvasId(event.target.value)}>
                <option value="">不绑定画布</option>
                {canvases.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              选择素材
              <select className="control" value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
                <option value="">不绑定素材</option>
                {filteredMaterials.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
          )}

          <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
            封面 URL
            <input className="control" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="可粘贴生成图、视频封面或外部图片 URL" />
          </label>

          {notice ? <p className="mt-3 rounded-lg bg-[#e7f8ee] p-3 text-sm text-[#248a3d]">{notice}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

          <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50" disabled={isPublishing || !title.trim()} onClick={submit}>
            {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isPublishing ? "提交中" : "提交审核"}
          </button>
        </aside>

        <main className="rounded-lg border border-black/10 bg-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <h2 className="text-sm font-semibold">发布记录</h2>
            <Link className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-semibold text-white" href="/discover">
              查看发现
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid min-h-80 place-items-center text-sm text-[#86868b]">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#0071e3]" />
                同步作品列表
              </span>
            </div>
          ) : works.length === 0 ? (
            <div className="grid min-h-80 place-items-center p-6 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f5f5f7] text-[#0071e3]">
                  <Plus size={20} />
                </div>
                <p className="mt-4 text-sm font-semibold">还没有发布作品</p>
                <p className="mt-2 text-sm text-[#86868b]">先从视频、图片或画布生成资产，再提交到发现流。</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {works.map((work) => (
                <WorkRow key={work.id} work={work} />
              ))}
            </div>
          )}
        </main>
      </section>

      <style jsx>{`
        .control {
          min-height: 44px;
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

function Metric({ icon: Icon, label, value }: { icon: typeof Layers3; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f2f8ff] text-[#0071e3]">
        <Icon size={18} />
      </div>
      <div className="mt-4 text-sm font-semibold text-[#6e6e73]">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function WorkRow({ work }: { work: Work }) {
  const Icon = work.work_type === "video" ? FileVideo : work.work_type === "image" ? ImageIcon : Layers3;
  const targetHref = work.work_type === "video" ? "/video" : work.work_type === "image" ? "/image" : "/canvas";
  const statusTone = work.status === "published" ? "bg-[#e7f8ee] text-[#248a3d]" : work.status === "rejected" ? "bg-red-50 text-red-600" : "bg-[#fff7ed] text-[#b45309]";

  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[96px_minmax(0,1fr)_160px] lg:items-center">
      <div className="h-24 overflow-hidden rounded-lg bg-[#f5f5f7]">
        {work.cover_url ? (
          <img className="h-full w-full object-cover" src={work.cover_url} alt={work.title} />
        ) : (
          <div className="grid h-full place-items-center text-[#0071e3]">
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{work.title}</h3>
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone}`}>{work.status}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6e6e73]">{work.description || "暂无描述"}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[#86868b]">
          <span>{work.work_type}</span>
          <span>{formatDate(work.created_at)}</span>
          <span>{work.like_count} 赞</span>
          <span>{work.bookmark_count} 收藏</span>
        </div>
      </div>
      <div className="flex gap-2 lg:justify-end">
        {work.status === "published" ? (
          <Link className="rounded-full bg-[#1d1d1f] px-3 py-2 text-xs font-semibold text-white" href={`/discover/${work.id}`}>
            详情
          </Link>
        ) : null}
        <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" href={`${targetHref}?prompt=${encodeURIComponent(work.title)}&reference=${encodeURIComponent(work.cover_url ?? "")}&subject=${encodeURIComponent(work.work_type)}`}>
          复刻
        </Link>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
