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
  const [models, setModels] = useState<ProviderModel[]>([]);

  useEffect(() => {
    apiClient.get<ProviderModel[]>("/videos/models").then((items) => {
      setModels(items);
      const preferred = items.find((item) => item.status === "configured" || item.status === "available");
      if (preferred ?? items[0]) setModelId((preferred ?? items[0]).model_id);
    }).catch(() => undefined);
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
          {models.length === 0 ? <option value="">加载中</option> : null}
        </select>
      </label>
      <label className="grid gap-1">
        时长
        <select
          className="rounded-md border border-line px-3 py-2"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          <option value={4}>4秒 · Veo最小测试</option>
          <option value={6}>6秒</option>
          <option value={8}>8秒</option>
        </select>
      </label>
    </div>
  );
}
