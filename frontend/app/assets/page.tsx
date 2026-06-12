"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brush,
  Copy,
  Download,
  FileText,
  GitBranch,
  Grid2X2,
  Image as ImageIcon,
  List,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  tags?: string[];
  is_subject?: boolean;
  status: string;
  created_at?: string;
};

type MaterialReference = {
  id: string;
  source_material_id?: string | null;
  target_material_id?: string | null;
  relation_type: string;
  created_at: string;
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

const dispatchTargets = {
  image: { label: "用作图片", href: "/image", icon: ImageIcon },
  video: { label: "用作视频", href: "/video", icon: Video },
  longVideo: { label: "用作长视频", href: "/long-video", icon: Sparkles },
  canvas: { label: "用到画布", href: "/canvas", icon: Brush },
  enhance: { label: "画质增强", href: "/tools/video-quality-enhance", icon: WandSparkles },
  remix: { label: "爆款裂变", href: "/tools/hot-video-remix", icon: Sparkles },
} as const;

type DispatchTargetKey = keyof typeof dispatchTargets;

export default function AssetsPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [preview, setPreview] = useState<Material | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState("product,reference");
  const [isUploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [references, setReferences] = useState<MaterialReference[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setBatchDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!preview) return;
    setEditTitle(preview.title);
    setEditTags((preview.tags ?? []).join(","));
    setReferences([]);
    setDetailError(null);
    apiClient
      .get<MaterialReference[]>(`/materials/${preview.id}/references`)
      .then(setReferences)
      .catch((err) => setDetailError(err instanceof Error ? err.message : "引用链加载失败"));
  }, [preview]);

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

  const selectedCount = selectedIds.size;
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));

  const remove = async (material: Material) => {
    if (!confirm(`确认删除 ${material.title}？`)) return;
    setError(null);
    try {
      await apiClient.delete(`/materials/${material.id}`);
      setMaterials((items) => items.filter((item) => item.id !== material.id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(material.id);
        return next;
      });
      if (preview?.id === material.id) setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "素材删除失败");
    }
  };

  const toggleSelected = (materialId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filtered.forEach((item) => next.delete(item.id));
      } else {
        filtered.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const batchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`确认批量删除 ${ids.length} 个素材？`)) return;
    setError(null);
    setBatchDeleting(true);
    try {
      await apiClient.post<{ deleted: string[] }>("/materials/batch-delete", { ids });
      setMaterials((items) => items.filter((item) => !selectedIds.has(item.id)));
      if (preview && selectedIds.has(preview.id)) setPreview(null);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "素材批量删除失败");
    } finally {
      setBatchDeleting(false);
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

  const savePreview = async () => {
    if (!preview) return;
    setSaving(true);
    setDetailError(null);
    try {
      const updated = await apiClient.put<Material>(`/materials/${preview.id}`, {
        title: editTitle.trim() || preview.title,
        tags: editTags.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setPreview(updated);
      setMaterials((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "素材保存失败");
    } finally {
      setSaving(false);
    }
  };

  const availableTargets = (material: Material): DispatchTargetKey[] => {
    if (material.material_type === "image") return ["image", "canvas", "enhance"];
    if (material.material_type === "video") return ["video", "longVideo", "enhance", "remix"];
    return ["canvas"];
  };

  const buildDispatchUrl = (material: Material, href: string) => {
    const params = new URLSearchParams();
    params.set("reference", material.url || material.id);
    params.set("subject", material.title);
    if (material.is_subject) params.set("subject_material_id", material.id);
    return `${href}?${params.toString()}`;
  };

  const copyMaterialUrl = async (material: Material) => {
    if (!material.url) {
      setActionNotice("该素材暂无可复制 URL");
      return;
    }
    await navigator.clipboard.writeText(material.url);
    setActionNotice("已复制素材 URL");
  };

  const downloadMaterial = (material: Material) => {
    if (!material.url) {
      setActionNotice("该素材暂无可下载文件");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = material.url;
    anchor.download = material.title || material.id;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setActionNotice("已开始下载");
  };

  const dispatchMaterial = async (material: Material, targetKey: DispatchTargetKey) => {
    const target = dispatchTargets[targetKey];
    try {
      await apiClient.post(`/materials/${material.id}/dispatch`, {
        action: "use_as_input",
        target_type: targetKey,
        target_route: target.href,
      });
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "素材派发记录失败，仍会继续打开工作台");
    }
    router.push(buildDispatchUrl(material, target.href));
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 py-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#424245]">
              <input className="h-4 w-4 accent-[#0071e3]" type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
              选择当前结果
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#86868b]">已选 {selectedCount}</span>
              <button className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-red-600 disabled:opacity-40" disabled={selectedCount === 0 || isBatchDeleting} onClick={batchDelete}>
                <Trash2 size={14} />
                {isBatchDeleting ? "删除中" : "批量删除"}
              </button>
            </div>
          </div>
          {error ? <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {actionNotice ? <div className="mb-3 rounded-lg bg-[#e8f2ff] p-3 text-sm font-semibold text-[#0071e3]">{actionNotice}</div> : null}
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
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#86868b]">
                      <input className="h-4 w-4 accent-[#0071e3]" type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} />
                      选择
                    </label>
                    {item.tags?.length ? <span className="truncate text-xs text-[#86868b]">{item.tags.slice(0, 2).join(",")}</span> : null}
                  </div>
                  <button className={`${viewMode === "grid" ? "aspect-square" : "h-16"} w-full overflow-hidden rounded-lg bg-[#f5f5f7] text-left`} onClick={() => setPreview(item)}>
                    {item.material_type === "image" && item.url ? <img className="h-full w-full object-cover" src={item.url} alt={item.title} /> : null}
                    {item.material_type === "video" && item.url ? <video className="h-full w-full object-cover" src={item.url} /> : null}
                    {!["image", "video"].includes(item.material_type) ? <div className="grid h-full place-items-center text-[#0071e3]"><Icon size={24} /></div> : null}
                  </button>
                  <div className={viewMode === "grid" ? "mt-3" : ""}>
                    <div className="font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-[#86868b]">{item.material_type} · {item.status}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full border border-black/10 p-2 text-[#0071e3]" onClick={() => downloadMaterial(item)} aria-label="下载">
                      <Download size={15} />
                    </button>
                    <button className="rounded-full border border-black/10 p-2 text-[#0071e3]" onClick={() => copyMaterialUrl(item)} aria-label="复制URL">
                      <Copy size={15} />
                    </button>
                    {availableTargets(item).slice(0, 3).map((targetKey) => {
                      const target = dispatchTargets[targetKey];
                      const TargetIcon = target.icon;
                      return (
                        <button
                          key={targetKey}
                          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-2 text-xs font-semibold text-[#0071e3]"
                          onClick={() => void dispatchMaterial(item, targetKey)}
                        >
                          <TargetIcon size={14} />
                          {target.label}
                        </button>
                      );
                    })}
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-3 pr-10 text-sm font-semibold">{preview.title}</div>
                {preview.material_type === "image" && preview.url ? <img className="max-h-[78vh] w-full object-contain" src={preview.url} alt={preview.title} /> : null}
                {preview.material_type === "video" && preview.url ? <video className="max-h-[78vh] w-full" src={preview.url} controls /> : null}
                {!["image", "video"].includes(preview.material_type) ? <div className="rounded-lg bg-[#f5f5f7] p-6 text-sm">{preview.url ?? preview.material_type}</div> : null}
              </div>
              <aside className="max-h-[78vh] overflow-auto rounded-lg border border-black/10 bg-[#f5f5f7] p-4">
                <h3 className="text-sm font-semibold">素材详情</h3>
                <label className="mt-4 grid gap-1 text-xs font-semibold text-[#6e6e73]">
                  标题
                  <input className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0071e3]" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                </label>
                <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
                  标签
                  <input className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0071e3]" value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="product,ugc,reference" />
                </label>
                <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-50" disabled={isSaving} onClick={savePreview}>
                  <Save size={15} />
                  {isSaving ? "保存中" : "保存素材"}
                </button>
                {detailError ? <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-600">{detailError}</p> : null}

                <div className="mt-5 grid gap-2 text-xs text-[#6e6e73]">
                  <Info label="类型" value={preview.material_type} />
                  <Info label="状态" value={preview.status} />
                  <Info label="MIME" value={preview.mime_type ?? "--"} />
                  <Info label="大小" value={formatBytes(preview.size_bytes)} />
                </div>

                <div className="mt-5 grid gap-2">
                  <div className="text-sm font-semibold">复用到工作台</div>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTargets(preview).map((targetKey) => {
                      const target = dispatchTargets[targetKey];
                      const TargetIcon = target.icon;
                      return (
                        <button
                          key={targetKey}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-[#0071e3]"
                          onClick={() => void dispatchMaterial(preview, targetKey)}
                        >
                          <TargetIcon size={14} />
                          {target.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#1d1d1f]" onClick={() => void copyMaterialUrl(preview)}>
                      <Copy size={14} />
                      复制 URL
                    </button>
                    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#1d1d1f]" onClick={() => downloadMaterial(preview)}>
                      <Download size={14} />
                      下载
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
                  <GitBranch size={16} className="text-[#0071e3]" />
                  引用链
                </div>
                <div className="mt-3 grid gap-2">
                  {references.length === 0 ? <div className="rounded-md border border-dashed border-black/10 bg-white p-3 text-xs text-[#86868b]">暂无引用记录</div> : null}
                  {references.map((ref) => (
                    <div key={ref.id} className="rounded-md border border-black/10 bg-white p-3 text-xs">
                      <div className="font-semibold text-[#1d1d1f]">{ref.relation_type}</div>
                      <div className="mt-1 break-all text-[#86868b]">source: {ref.source_material_id ?? "--"}</div>
                      <div className="mt-1 break-all text-[#86868b]">target: {ref.target_material_id ?? "--"}</div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-[#1d1d1f]">{value}</span>
    </div>
  );
}

function formatBytes(value?: number | null) {
  if (!value) return "--";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
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
