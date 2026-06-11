"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Masonry from "react-masonry-css";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";
import { WorkCard } from "./components/WorkCard";

type Work = {
  id: string;
  title: string;
  work_type: string;
  cover_url?: string | null;
  like_count: number;
};

export default function DiscoverPage() {
  const [tab, setTab] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    const query = tab ? `?tab=${tab}` : "";
    apiClient.get<Work[]>(`/community/works${query}`).then(setWorks).catch(() => setWorks([]));
  }, [tab]);

  return (
    <Panel title="发现">
      <div className="mb-4 flex gap-2">
        {[
          { label: "发现", value: null },
          { label: "视频", value: "video" },
          { label: "图片", value: "image" },
          { label: "画布", value: "canvas" },
        ].map((item) => (
          <button
            key={item.label}
            className={`rounded-md border border-line px-3 py-2 text-sm ${
              tab === item.value ? "bg-accent text-white" : "bg-white"
            }`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {works.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-8 text-center text-sm text-slate-500">
          暂无作品，去创作第一个吧
          <Link className="ml-3 rounded-md bg-accent px-3 py-2 text-white" href="/image">去创作</Link>
        </div>
      ) : (
        <Masonry breakpointCols={{ default: 4, 900: 3, 640: 2 }} className="masonry-grid" columnClassName="masonry-column">
          {works.map((work) => (
            <WorkCard key={work.id} id={work.id} title={work.title} workType={work.work_type} coverUrl={work.cover_url} likeCount={work.like_count} />
          ))}
        </Masonry>
      )}
    </Panel>
  );
}
