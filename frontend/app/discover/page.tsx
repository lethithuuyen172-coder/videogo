"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Masonry from "react-masonry-css";
import { Compass, Flame, Image as ImageIcon, Search, Video } from "lucide-react";
import { apiClient } from "@/lib/api";
import { WorkCard } from "./components/WorkCard";

type Work = {
  id: string;
  title: string;
  work_type: string;
  cover_url?: string | null;
  like_count: number;
};

const tabs = [
  { label: "发现", value: null, icon: Compass },
  { label: "视频", value: "video", icon: Video },
  { label: "图片", value: "image", icon: ImageIcon },
  { label: "画布", value: "canvas", icon: Flame },
];

export default function DiscoverPage() {
  const [tab, setTab] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const query = tab ? `?tab=${tab}` : "";
    apiClient.get<Work[]>(`/community/works${query}`).then(setWorks).catch(() => setWorks([]));
  }, [tab]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return works;
    return works.filter((work) => `${work.title} ${work.work_type}`.toLowerCase().includes(keyword));
  }, [query, works]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Explore</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">发现</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              浏览视频、图片、画布作品和可复刻模板，沉淀 DA 类作品社区与创作灵感流。
            </p>
          </div>
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" size={16} />
            <input
              className="h-11 w-full rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品、类型、模板"
            />
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
                tab === item.value ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/10 bg-white text-[#1d1d1f]"
              }`}
              onClick={() => setTab(item.value)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
        <Link className="ml-auto inline-flex h-10 items-center rounded-full bg-[#1d1d1f] px-4 text-sm font-semibold text-white" href="/image">
          去创作
        </Link>
      </div>

      <section className="mt-5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/10 bg-white/85 p-10 text-center text-sm text-[#6e6e73]">
            暂无作品，去创作第一个吧。先生成图片、视频或画布作品，后续可发布到发现流。
            <div className="mt-4 flex justify-center gap-2">
              <Link className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white" href="/video">生成视频</Link>
              <Link className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#0071e3]" href="/image">生成图片</Link>
            </div>
          </div>
        ) : (
          <Masonry breakpointCols={{ default: 4, 1100: 3, 760: 2 }} className="masonry-grid" columnClassName="masonry-column">
            {filtered.map((work) => (
              <WorkCard key={work.id} id={work.id} title={work.title} workType={work.work_type} coverUrl={work.cover_url} likeCount={work.like_count} />
            ))}
          </Masonry>
        )}
      </section>
    </div>
  );
}
