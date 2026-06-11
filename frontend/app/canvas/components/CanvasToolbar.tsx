"use client";

import { Download, Redo2, Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api";

export function CanvasToolbar({
  title,
  canvasId,
  zoom,
  setZoom,
  undo,
  redo,
}: {
  title: string;
  canvasId: string;
  zoom: number;
  setZoom: (value: number) => void;
  undo: () => void;
  redo: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setExporting] = useState(false);

  const exportCanvas = async () => {
    setError(null);
    setExporting(true);
    try {
      const result = await apiClient.post<{ url: string }>(`/canvases/${canvasId}/export`);
      alert(`导出完成：${result.url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="border-b border-line bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input className="rounded-md border border-line px-2 py-1 text-sm" defaultValue={title} />
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-line p-2" onClick={undo} aria-label="撤销">
            <Undo2 size={16} />
          </button>
          <button className="rounded-md border border-line p-2" onClick={redo} aria-label="重做">
            <Redo2 size={16} />
          </button>
          <input className="w-28" type="range" min={50} max={200} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <span className="w-12 text-xs text-slate-500">{zoom}%</span>
          <button className="rounded-md border border-line p-2" aria-label="保存">
            <Save size={16} />
          </button>
          <button className="rounded-md border border-line p-2 disabled:opacity-50" disabled={isExporting} onClick={exportCanvas} aria-label="导出">
            <Download size={16} />
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
