"use client";

import { useEffect, useState } from "react";
import { Grid2X2, List, Trash2, Upload, X } from "lucide-react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

type Material = {
  id: string;
  title: string;
  material_type: string;
  url?: string;
  status: string;
};

export default function AssetsPage() {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [preview, setPreview] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Panel title="资产中心">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { label: "全部", value: null },
          { label: "图片", value: "image" },
          { label: "视频", value: "video" },
          { label: "音频", value: "audio" },
          { label: "文字", value: "text" },
        ].map((tab) => (
          <button
            key={tab.label}
            className={`rounded-md border border-line px-3 py-2 text-sm ${
              activeType === tab.value ? "bg-accent text-white" : "bg-white"
            }`}
            onClick={() => setActiveType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="rounded-md border border-line p-2" aria-label="网格">
            <Grid2X2 size={16} />
          </button>
          <button className="rounded-md border border-line p-2" aria-label="列表">
            <List size={16} />
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-white">
            <Upload size={16} />
            上传
          </button>
        </div>
      </div>
      {error ? <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {materials.length === 0 && !error ? (
          <div className="col-span-full rounded-md border border-dashed border-line p-6 text-sm text-slate-500">
            暂无素材
          </div>
        ) : null}
        {materials.map((item) => (
          <div key={item.id} className="group rounded-md border border-line bg-white p-3 text-sm">
            <button className="block aspect-square w-full overflow-hidden rounded-md bg-panel text-left" onClick={() => setPreview(item)}>
              {item.material_type === "image" && item.url ? <img className="h-full w-full object-cover" src={item.url} alt={item.title} /> : null}
              {item.material_type === "video" && item.url ? <video className="h-full w-full object-cover" src={item.url} /> : null}
              {!["image", "video"].includes(item.material_type) ? <div className="p-3 text-xs text-slate-500">{item.material_type}</div> : null}
            </button>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500">{item.material_type}</div>
              </div>
              <button className="rounded-md border border-line p-2 text-red-600" onClick={() => remove(item)} aria-label="删除">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-md bg-white p-4">
            <button className="absolute right-3 top-3 rounded-md border border-line bg-white p-2" onClick={() => setPreview(null)} aria-label="关闭">
              <X size={16} />
            </button>
            <div className="mb-3 pr-10 text-sm font-semibold">{preview.title}</div>
            {preview.material_type === "image" && preview.url ? <img className="max-h-[78vh] w-full object-contain" src={preview.url} alt={preview.title} /> : null}
            {preview.material_type === "video" && preview.url ? <video className="max-h-[78vh] w-full" src={preview.url} controls /> : null}
            {!["image", "video"].includes(preview.material_type) ? <div className="rounded-md bg-panel p-6 text-sm">{preview.url ?? preview.material_type}</div> : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
