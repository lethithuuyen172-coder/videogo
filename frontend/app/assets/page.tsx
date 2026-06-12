"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Grid2X2, Image as ImageIcon, List, Search, Trash2, Upload, Video, X } from "lucide-react";
import { apiClient } from "@/lib/api";

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string;
  status: string;
};

const typeTabs = [
  { label: "全部", value: null },
  { label: "图片", value: "image" },
  { label: "视频", value: "video" },
  { label: "音频", value: "audio" },
  { label: "文字", value: "text" },
];

const typeIcon: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  text: FileText,
};

export default function AssetsPage() {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [preview, setPreview] = useState<Material | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState("product,reference");
  const [isUploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const load = () => {
    const query = activeType ? `?material_type=${activeType}` : "";
    apiClient
      .get<Material[]>(`/materials${query}`)
      .then(setMaterials)
      .catch((err) => setError(err instanceof Error ? err.message : "素材加载失败"));
  };

  useEffect(() => {
    load();
  }, [activeType]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return materials;
    return materials.filter((item) => `${item.title} ${item.material_type} ${item.status}`.toLowerCase().includes(keyword));
  }, [materials, query]);

  const stats = useMemo(() => {
    return {
      all: materials.length,
      image: materials.filter((item) => item.material_type === "image").length,
      video: materials.filter((item) => item.material_type === "video").length,
      text: materials.filter((item) => item.material_type === "text").length,
    };
  }, [materials]);

  const remove = async (material: Material) => {
    if (!confirm(`确认删除 ${material.title}？`)) return;
    setError(null);
    try {
      await apiClient.delete(`/materials/${material.id}`);
      setMaterials((items) => items.filter((item) => item.id !== material.id));
      if (preview?.id === material.id) setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "素材删除失败");
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const items = [...files];
    if (items.length === 0) return;
    setError(null);
    setUploadNotice(null);
    setUploading(true);
    try {
      const uploaded: Material[] = [];
      for (const file of items) {
        const form = new FormData();
        form.append("file", file);
        form.append("tags", tags);
        uploaded.push(await apiClient.post<Material>("/materials", form));
      }
      setMaterials((current) => [...uploaded, ...current]);
      setUploadNotice(`已上传 ${uploaded.length} 个素材`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "素材上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Assets</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">资产中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              管理上传素材、生成结果、商品图、视频切片和可复用提示词，打通 DA 类创作链路中的素材池。
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <Metric label="全部" value={`${stats.all}`} />
            <Metric label="图片" value={`${stats.image}`} />
            <Metric label="视频" value={`${stats.video}`} />
            <Metric label="文本" value={`${stats.text}`} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="grid h-fit gap-4">
          <Panel title="上传素材">
            <div
              className={`rounded-lg border border-dashed p-5 text-center transition ${isUploading ? "border-[#0071e3] bg-[#f2f8ff]" : "border-[#b9c3d0] bg-[#f5f5f7]"}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadFiles(event.dataTransfer.files);
              }}
            >
              <Upload className="mx-auto text-[#0071e3]" size={24} />
              <div className="mt-3 text-sm font-semibold">拖拽或选择文件</div>
              <p className="mt-2 text-xs leading-5 text-[#6e6e73]">支持图片、视频、音频和文本，后续会进入生成参考素材库。</p>
              <label className="mt-4 inline-flex cursor-pointer rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white">
                {isUploading ? "上传中" : "选择文件"}
                <input
                  className="hidden"
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,text/plain,.txt,.md,.json"
                  disabled={isUploading}
                  onChange={(event) => {
                    if (event.target.files) void uploadFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              上传标签
              <input
                className="h-10 rounded-md border border-black/10 bg-[#f5f5f7] px-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="用英文逗号分隔"
              />
            </label>
            {uploadNotice ? <p className="mt-3 rounded-lg bg-[#e7f8ee] p-3 text-sm text-[#248a3d]">{uploadNotice}</p> : null}
          </Panel>
          <Panel title="类型筛选">
            <div className="grid gap-2">
              {typeTabs.map((tab) => (
                <button
                  key={tab.label}
                  className={`h-10 rounded-full px-4 text-left text-sm font-semibold ${activeType === tab.value ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
                  onClick={() => setActiveType(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        <main className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-64 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" size={16} />
              <input
                className="h-11 w-full rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索素材名称、类型、状态"
              />
            </div>
            <button className={`rounded-full p-3 ${viewMode === "grid" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7]"}`} onClick={() => setViewMode("grid")} aria-label="网格">
              <Grid2X2 size={16} />
            </button>
            <button className={`rounded-full p-3 ${viewMode === "list" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7]"}`} onClick={() => setViewMode("list")} aria-label="列表">
              <List size={16} />
            </button>
          </div>
          {error ? <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {filtered.length === 0 && !error ? (
            <div className="rounded-lg border border-dashed border-black/10 bg-[#f5f5f7] p-10 text-center text-sm text-[#6e6e73]">
              暂无素材。先上传商品图、视频参考或生成结果。
            </div>
          ) : null}
          <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-2"}>
            {filtered.map((item) => {
              const Icon = typeIcon[item.material_type] ?? FileText;
              return (
                <article key={item.id} className={`rounded-lg border border-black/10 bg-white p-3 text-sm ${viewMode === "list" ? "grid grid-cols-[80px_1fr_auto] items-center gap-3" : ""}`}>
                  <button className={`${viewMode === "grid" ? "aspect-square" : "h-16"} w-full overflow-hidden rounded-lg bg-[#f5f5f7] text-left`} onClick={() => setPreview(item)}>
                    {item.material_type === "image" && item.url ? <img className="h-full w-full object-cover" src={item.url} alt={item.title} /> : null}
                    {item.material_type === "video" && item.url ? <video className="h-full w-full object-cover" src={item.url} /> : null}
                    {!["image", "video"].includes(item.material_type) ? <div className="grid h-full place-items-center text-[#0071e3]"><Icon size={24} /></div> : null}
                  </button>
                  <div className={viewMode === "grid" ? "mt-3" : ""}>
                    <div className="font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-[#86868b]">{item.material_type} · {item.status}</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-full border border-black/10 p-2 text-[#0071e3]" aria-label="下载">
                      <Download size={15} />
                    </button>
                    <button className="rounded-full border border-black/10 p-2 text-red-600" onClick={() => remove(item)} aria-label="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white p-4">
            <button className="absolute right-3 top-3 rounded-full border border-black/10 bg-white p-2" onClick={() => setPreview(null)} aria-label="关闭">
              <X size={16} />
            </button>
            <div className="mb-3 pr-10 text-sm font-semibold">{preview.title}</div>
            {preview.material_type === "image" && preview.url ? <img className="max-h-[78vh] w-full object-contain" src={preview.url} alt={preview.title} /> : null}
            {preview.material_type === "video" && preview.url ? <video className="max-h-[78vh] w-full" src={preview.url} controls /> : null}
            {!["image", "video"].includes(preview.material_type) ? <div className="rounded-lg bg-[#f5f5f7] p-6 text-sm">{preview.url ?? preview.material_type}</div> : null}
          </div>
        </div>
      ) : null}
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
