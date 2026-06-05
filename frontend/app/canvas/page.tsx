import Link from "next/link";
import { Plus } from "lucide-react";
import { Panel } from "@/components/Panel";

export default function CanvasHomePage() {
  return (
    <Panel title="我的画布">
      <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" href="/canvas/new">
        <Plus size={16} />
        新建空白画布
      </Link>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link className="aspect-[9/16] rounded-md border border-line bg-white p-3 text-sm" href="/canvas/demo">
          TikTok 产品模板
        </Link>
      </div>
    </Panel>
  );
}
