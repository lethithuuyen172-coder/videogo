"use client";

import { Download, Save } from "lucide-react";

export function CanvasToolbar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-white px-3 py-2">
      <input className="rounded-md border border-line px-2 py-1 text-sm" defaultValue={title} />
      <div className="flex gap-2">
        <button className="rounded-md border border-line p-2" aria-label="保存">
          <Save size={16} />
        </button>
        <button className="rounded-md border border-line p-2" aria-label="导出">
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
