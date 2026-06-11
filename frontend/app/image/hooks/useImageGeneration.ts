"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type ImageJob = {
  id: string;
  status: string;
  progress: number;
  output_url?: string;
  credit_cost: number;
};

type RunMode = "sync" | "queue";

export function useImageGeneration() {
  const [job, setJob] = useState<ImageJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setRunning] = useState(false);

  const createJob = async (payload: Record<string, unknown>, mode: RunMode) => {
    setError(null);
    setRunning(true);
    try {
      const created = await apiClient.post<ImageJob>("/images", payload);
      if (mode === "queue") {
        await apiClient.post(`/images/${created.id}/enqueue`);
        setJob(created);
        setJob(await pollImageJob(created.id));
      } else {
        const completed = await apiClient.post<ImageJob>(`/images/${created.id}/run-now`);
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

async function pollImageJob(jobId: string): Promise<ImageJob> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    const next = await apiClient.get<ImageJob>(`/images/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(next.status)) {
      return next;
    }
  }
  return apiClient.get<ImageJob>(`/images/${jobId}`);
}
