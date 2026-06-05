"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type ProviderModel = {
  model_id: string;
  name: string;
  status: string;
  credit_cost: number;
};

export function VideoSettingsPanel({
  modelId,
  setModelId,
  duration,
  setDuration,
}: {
  modelId: string;
  setModelId: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
}) {
  const [models, setModels] = useState<ProviderModel[]>([
    { model_id: "mock-video", name: "Mock Video", status: "available", credit_cost: 10 },
  ]);

  useEffect(() => {
    apiClient.get<ProviderModel[]>("/videos/models").then(setModels).catch(() => undefined);
  }, []);

  return (
    <div className="grid gap-3 text-sm">
      <label className="grid gap-1">
        模型
        <select
          className="rounded-md border border-line px-3 py-2"
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
        >
          {models.map((model) => (
            <option key={model.model_id} value={model.model_id}>
              {model.name} · {model.status}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        时长
        <select
          className="rounded-md border border-line px-3 py-2"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          <option value={15}>15秒</option>
          <option value={30}>30秒</option>
          <option value={40}>40秒</option>
        </select>
      </label>
    </div>
  );
}
