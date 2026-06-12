"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bookmark, CopyPlus, Heart, Image as ImageIcon, Sparkles, Video } from "lucide-react";
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

  const targetHref = work?.work_type === "image" ? "/image" : work?.work_type === "canvas" ? "/canvas" : "/video";
  const TypeIcon = work?.work_type === "image" ? ImageIcon : work?.work_type === "canvas" ? CopyPlus : Video;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href="/discover">
          <ArrowLeft size={16} />
          返回发现
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,113,227,0.24)]"
          href={`${targetHref}?prompt=${encodeURIComponent(work?.title ?? "")}&reference=${encodeURIComponent(work?.cover_url ?? "")}&subject=${encodeURIComponent(work?.work_type ?? "")}`}
        >
          <Sparkles size={16} />
          复刻到工作台
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-black/10 bg-white/85 shadow-[0_24px_80px_rgba(0,0,0,0.10)] backdrop-blur-xl">
          <div className="border-b border-black/10 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Community Work</p>
                <h1 className="mt-2 truncate text-2xl font-semibold md:text-3xl">{work?.title ?? "作品详情"}</h1>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f5f5f7] px-3 py-2 text-xs font-semibold text-[#6e6e73]">
                <TypeIcon size={15} />
                {work?.work_type ?? "loading"}
              </span>
            </div>
          </div>

          <div className="grid min-h-[640px] place-items-center bg-[radial-gradient(circle_at_top,#ffffff_0,#f5f5f7_44%,#e8e8ed_100%)] p-5">
            {work?.cover_url ? (
              <img className="max-h-[680px] w-full rounded-lg object-contain shadow-[0_24px_70px_rgba(0,0,0,0.14)]" src={work.cover_url} alt={work.title} />
            ) : (
              <div className="grid h-[420px] w-full max-w-xl place-items-center rounded-lg border border-dashed border-black/10 bg-white/70 text-sm text-[#86868b]">
                暂无预览
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-black/10 bg-white/85 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
            <p className="text-sm leading-6 text-[#6e6e73]">{work?.description ?? "暂无描述。可直接复刻到视频、图片或画布工作台，再加入商品素材和脚本进行二次创作。"}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f5f5f7] p-4">
                <p className="text-xs font-semibold text-[#86868b]">点赞</p>
                <p className="mt-2 text-2xl font-semibold">{work?.like_count ?? 0}</p>
              </div>
              <div className="rounded-lg bg-[#f5f5f7] p-4">
                <p className="text-xs font-semibold text-[#86868b]">收藏</p>
                <p className="mt-2 text-2xl font-semibold">{work?.bookmark_count ?? 0}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold disabled:opacity-50 ${
                  liked ? "border-[#ff2d55] bg-[#ff2d55] text-white" : "border-black/10 bg-white text-[#1d1d1f]"
                }`}
                disabled={isMutating}
                onClick={toggleLike}
                aria-label="点赞"
              >
                <Heart size={16} />
                点赞
              </button>
              <button
                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold disabled:opacity-50 ${
                  bookmarked ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/10 bg-white text-[#1d1d1f]"
                }`}
                disabled={isMutating}
                onClick={toggleBookmark}
                aria-label="收藏"
              >
                <Bookmark size={16} />
                收藏
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Remix Flow</p>
            <h2 className="mt-2 text-xl font-semibold">把社区作品变成带货资产</h2>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <p>1. 复刻标题、封面和类型到生成工作台。</p>
              <p>2. 替换为自己的商品素材、卖点和 TikTok 受众。</p>
              <p>3. 进入长视频或画布流程扩写脚本、拆分分镜、生成发布物料。</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
