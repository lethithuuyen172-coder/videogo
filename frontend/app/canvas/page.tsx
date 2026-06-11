"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

type CanvasItem = {
  id: string;
  title: string;
  created_at: string;
};

export default function CanvasHomePage() {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<CanvasItem[]>("/canvases").then(setItems).catch((err) => setError(err instanceof Error ? err.message : "画布加载失败"));
  }, []);

  const createCanvas = async () => {
    setError(null);
    try {
      const created = await apiClient.post<CanvasItem>("/canvases", { title: "未命名画布" });
      setItems((next) => [created, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画布创建失败");
    }
  };

  return (
    <Panel title="我的画布">
      <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={createCanvas}>
        <Plus size={16} />
        新建空白画布
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.length === 0 ? <div className="col-span-full rounded-md border border-dashed border-line p-6 text-sm text-slate-500">还没有画布，新建一个吧</div> : null}
        {items.map((item) => (
          <Link key={item.id} className="aspect-[9/16] rounded-md border border-line bg-white p-3 text-sm hover:bg-panel" href={`/canvas/${item.id}`}>
            <div className="font-medium">{item.title}</div>
            <div className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
