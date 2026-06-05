"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type ProviderModel = {
  model_id: string;
  name: string;
  status: string;
  credit_cost: number;
};

export function ImageSettingsPanel({
  modelId,
  setModelId,
  resolution,
  setResolution,
}: {
  modelId: string;
  setModelId: (value: string) => void;
  resolution: string;
  setResolution: (value: string) => void;
}) {
  const [models, setModels] = useState<ProviderModel[]>([
    { model_id: "mock-image", name: "Mock Image", status: "available", credit_cost: 5 },
  ]);

  useEffect(() => {
    apiClient.get<ProviderModel[]>("/images/models").then(setModels).catch(() => undefined);
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
        分辨率
        <select className="rounded-md border border-line px-3 py-2" value={resolution} onChange={(event) => setResolution(event.target.value)}>
          <option value="512">512</option>
          <option value="1024">1024</option>
          <option value="2048">2048</option>
        </select>
      </label>
    </div>
  );
}
