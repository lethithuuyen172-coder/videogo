"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Panel } from "@/components/Panel";

export default function EnhancePage() {
  const [resolution, setResolution] = useState("4K");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel title="画质增强参数">
        <label className="grid gap-1 text-sm">
          目标分辨率
          <select className="rounded-md border border-line px-3 py-2" value={resolution} onChange={(event) => setResolution(event.target.value)}>
            <option>2K</option>
            <option>4K</option>
          </select>
        </label>
        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white">
          <Upload size={16} />
          上传并增强
        </button>
      </Panel>
      <Panel title="进度">
        <div className="rounded-md border border-dashed border-line p-8 text-center text-sm text-slate-500">等待上传素材</div>
      </Panel>
    </div>
  );
}
