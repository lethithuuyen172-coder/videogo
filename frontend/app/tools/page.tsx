"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

type ToolItem = {
  tool_key: string;
  name: string;
  status: string;
  credit_cost: number;
};

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolItem[]>([]);

  useEffect(() => {
    apiClient.get<ToolItem[]>("/tools").then(setTools).catch(() => setTools([]));
  }, []);

  return (
    <Panel title="工具箱">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.tool_key}
            className="rounded-md border border-line bg-white p-4 hover:bg-panel"
            href={tool.tool_key === "enhance" ? "/tools/enhance" : "/tools"}
          >
            <Wand2 size={18} />
            <div className="mt-3 text-sm font-semibold">{tool.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              {tool.status} · {tool.credit_cost} 积分
            </div>
          </Link>
        ))}
        {tools.length === 0 ? <div className="text-sm text-slate-500">暂无可用工具</div> : null}
      </div>
    </Panel>
  );
}
