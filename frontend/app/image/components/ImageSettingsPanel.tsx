"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type ProviderModel = {
  model_id: string;
  name: string;
  status: string;
  credit_cost: number;
};

type ImageStyle = {
  style_key: string;
  name: string;
  prompt_suffix: string;
};

export function ImageSettingsPanel({
  modelId,
  setModelId,
  resolution,
  setResolution,
  styleKey,
  setStyleKey,
}: {
  modelId: string;
  setModelId: (value: string) => void;
  resolution: string;
  setResolution: (value: string) => void;
  styleKey: string;
  setStyleKey: (value: string) => void;
}) {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [styles, setStyles] = useState<ImageStyle[]>([]);

  useEffect(() => {
    const loadModels = () => apiClient.get<ProviderModel[]>("/images/models").then((items) => {
      setModels(items);
      const preferred = items.find((item) => item.model_id === "dalle-3" && item.status === "configured");
      if (preferred ?? items[0]) setModelId((preferred ?? items[0]).model_id);
    }).catch(() => undefined);
    loadModels();
    window.addEventListener("openai-api-key-updated", loadModels);
    apiClient.get<ImageStyle[]>("/images/styles").then((items) => {
      setStyles(items);
      if (items[0]) setStyleKey(items[0].style_key);
    }).catch(() => undefined);
    return () => window.removeEventListener("openai-api-key-updated", loadModels);
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
        风格
        <select className="rounded-md border border-line px-3 py-2" value={styleKey} onChange={(event) => setStyleKey(event.target.value)}>
          {styles.map((style) => (
            <option key={style.style_key} value={style.style_key}>
              {style.name}
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
