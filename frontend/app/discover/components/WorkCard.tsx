"use client";

import Link from "next/link";
import { Heart, Sparkles } from "lucide-react";

export function WorkCard({
  id,
  title,
  workType,
  coverUrl,
  likeCount,
}: {
  id: string;
  title: string;
  workType: string;
  coverUrl?: string | null;
  likeCount: number;
}) {
  return (
    <Link className="group block overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]" href={`/discover/${id}`}>
      <div className="relative aspect-[3/4] bg-[#f5f5f7]">
        {coverUrl ? <img className="h-full w-full object-cover" src={coverUrl} alt={title} /> : (
          <div className="grid h-full place-items-center text-[#0071e3]">
            <Sparkles size={32} />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1d1d1f] backdrop-blur">
          {workType}
        </div>
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-sm font-semibold leading-5">{title}</div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#86868b]">
          <span>可复刻作品</span>
          <span className="inline-flex items-center gap-1">
            <Heart size={15} />
            {likeCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
