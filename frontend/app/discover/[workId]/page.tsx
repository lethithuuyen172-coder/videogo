"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bookmark, Heart } from "lucide-react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

type Work = {
  id: string;
  title: string;
  description?: string | null;
  work_type: string;
  cover_url?: string | null;
  like_count: number;
  bookmark_count: number;
};

export default function WorkDetailPage() {
  const params = useParams<{ workId: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setMutating] = useState(false);

  useEffect(() => {
    apiClient.get<Work>(`/community/works/${params.workId}`).then(setWork).catch((err) => setError(err instanceof Error ? err.message : "作品加载失败"));
  }, [params.workId]);

  const toggleLike = async () => {
    if (!work || isMutating) return;
    setError(null);
    setMutating(true);
    try {
      await (liked ? apiClient.delete(`/community/works/${work.id}/like`) : apiClient.post(`/community/works/${work.id}/like`));
      setLiked(!liked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "点赞操作失败");
    } finally {
      setMutating(false);
    }
  };

  const toggleBookmark = async () => {
    if (!work || isMutating) return;
    setError(null);
    setMutating(true);
    try {
      await (bookmarked ? apiClient.delete(`/community/works/${work.id}/bookmark`) : apiClient.post(`/community/works/${work.id}/bookmark`));
      setBookmarked(!bookmarked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "收藏操作失败");
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel>
        <div className="grid min-h-[620px] place-items-center rounded-md bg-panel">
          {work?.cover_url ? <img className="max-h-[620px] w-full object-contain" src={work.cover_url} alt={work.title} /> : <span className="text-sm text-slate-500">暂无预览</span>}
        </div>
      </Panel>
      <Panel title={work?.title ?? "作品详情"}>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <p className="text-sm text-slate-600">{work?.description ?? "暂无描述"}</p>
        <div className="mt-2 text-xs text-slate-500">{work?.work_type}</div>
        <div className="mt-4 flex gap-2">
          <button className={`rounded-md border border-line p-2 disabled:opacity-50 ${liked ? "bg-accent text-white" : "bg-white"}`} disabled={isMutating} onClick={toggleLike} aria-label="点赞">
            <Heart size={16} />
          </button>
          <button className={`rounded-md border border-line p-2 disabled:opacity-50 ${bookmarked ? "bg-accent text-white" : "bg-white"}`} disabled={isMutating} onClick={toggleBookmark} aria-label="收藏">
            <Bookmark size={16} />
          </button>
        </div>
      </Panel>
    </div>
  );
}
