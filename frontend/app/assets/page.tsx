"use client";

import { useEffect, useState } from "react";
import { Grid2X2, List, Upload } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = activeType ? `?material_type=${activeType}` : "";
    apiClient
      .get<Material[]>(`/materials${query}`)
      .then(setMaterials)
      .catch((err) => setError(err instanceof Error ? err.message : "素材加载失败"));
  }, [activeType]);

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
          <div key={item.id} className="aspect-square rounded-md border border-line bg-white p-3 text-sm">
            <div className="font-medium">{item.title}</div>
            <div className="mt-1 text-xs text-slate-500">{item.material_type}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
