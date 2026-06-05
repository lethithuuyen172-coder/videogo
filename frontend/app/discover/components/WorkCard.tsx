"use client";

import { Heart } from "lucide-react";

export function WorkCard({ title, height }: { title: string; height: number }) {
  return (
    <article className="overflow-hidden rounded-md border border-line bg-white">
      <div className="bg-slate-200" style={{ height }} />
      <div className="flex h-14 items-center justify-between px-3 text-sm">
        <span>{title}</span>
        <button className="inline-flex items-center gap-1" aria-label="点赞">
          <Heart size={16} />
          128
        </button>
      </div>
    </article>
  );
}
