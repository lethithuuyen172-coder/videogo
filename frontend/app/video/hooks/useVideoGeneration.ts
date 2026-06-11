"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type VideoJob = {
  id: string;
  status: string;
  progress: number;
  output_url?: string;
  credit_cost: number;
};

type RunMode = "sync" | "queue";

export function useVideoGeneration() {
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setRunning] = useState(false);

  const createJob = async (payload: Record<string, unknown>, mode: RunMode) => {
    setError(null);
    setRunning(true);
    try {
      if (mode === "sync") {
        const completed = await apiClient.post<VideoJob>("/videos/run-direct", payload);
        setJob(completed);
        return;
      }
      const created = await apiClient.post<VideoJob>("/videos", payload);
      if (mode === "queue") {
        await apiClient.post(`/videos/${created.id}/enqueue`);
        setJob(created);
        setJob(await pollVideoJob(created.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务创建失败");
    } finally {
      setRunning(false);
    }
  };

  return { job, error, isRunning, createJob };
}

async function pollVideoJob(jobId: string): Promise<VideoJob> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    const next = await apiClient.get<VideoJob>(`/videos/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(next.status)) {
      return next;
    }
  }
  return apiClient.get<VideoJob>(`/videos/${jobId}`);
}
