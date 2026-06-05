import { Bookmark, Heart } from "lucide-react";
import { Panel } from "@/components/Panel";

export default async function WorkDetailPage({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel>
        <div className="min-h-[620px] rounded-md bg-slate-200" />
      </Panel>
      <Panel title={`作品 ${workId}`}>
        <p className="text-sm text-slate-600">生成参数、提示词和作者更多作品展示在这里。</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md border border-line p-2" aria-label="点赞">
            <Heart size={16} />
          </button>
          <button className="rounded-md border border-line p-2" aria-label="收藏">
            <Bookmark size={16} />
          </button>
        </div>
      </Panel>
    </div>
  );
}
