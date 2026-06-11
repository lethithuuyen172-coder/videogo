"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

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
    <Link className="block overflow-hidden rounded-md border border-line bg-white" href={`/discover/${id}`}>
      <div className="aspect-[3/4] bg-panel">
        {coverUrl ? <img className="h-full w-full object-cover" src={coverUrl} alt={title} /> : null}
      </div>
      <div className="flex h-14 items-center justify-between px-3 text-sm">
        <span className="truncate">{title} · {workType}</span>
        <button className="inline-flex items-center gap-1" aria-label="点赞">
          <Heart size={16} />
          {likeCount}
        </button>
      </div>
    </Link>
  );
}
