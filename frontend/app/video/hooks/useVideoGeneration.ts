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
      const created = await apiClient.post<VideoJob>("/videos", payload);
      if (mode === "queue") {
        await apiClient.post(`/videos/${created.id}/enqueue`);
        setJob(created);
      } else {
        const completed = await apiClient.post<VideoJob>(`/videos/${created.id}/run-now`);
        setJob(completed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务创建失败");
    } finally {
      setRunning(false);
    }
  };

  return { job, error, isRunning, createJob };
}
