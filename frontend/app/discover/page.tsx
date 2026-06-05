"use client";

import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";
import { WorkCard } from "./components/WorkCard";

type Work = {
  id: string;
  title: string;
  work_type: string;
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
      <Masonry breakpointCols={{ default: 4, 900: 3, 640: 2 }} className="masonry-grid" columnClassName="masonry-column">
        {works.length === 0
          ? Array.from({ length: 8 }).map((_, index) => (
              <WorkCard key={index} title={`演示作品 ${index + 1}`} height={180 + (index % 4) * 42} />
            ))
          : works.map((work, index) => (
              <WorkCard key={work.id} title={work.title} height={180 + (index % 4) * 42} />
            ))}
      </Masonry>
    </Panel>
  );
}
