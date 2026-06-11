"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";
import { CanvasToolbar } from "../components/CanvasToolbar";
import { CanvasWorkspace } from "../components/CanvasWorkspace";
import { ComponentPanel } from "../components/ComponentPanel";
import { LayerPanel } from "../components/LayerPanel";

export type CanvasElement = {
  id: string;
  canvas_id: string;
  element_type: "image" | "text" | "rect" | "circle" | "line";
  z_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  props: Record<string, string | number>;
};

type CanvasData = {
  canvas: { id: string; title: string; width: number; height: number; background_color: string };
  elements: CanvasElement[];
};

export default function CanvasEditorPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const [data, setData] = useState<CanvasData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(60);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [future, setFuture] = useState<CanvasElement[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<CanvasData>(`/canvases/${canvasId}`).then((next) => {
      setData(next);
      setSelectedId(next.elements[0]?.id ?? null);
    }).catch(() => undefined);
  }, [canvasId]);

  const persist = async (element: CanvasElement) => {
    try {
      const saved = await apiClient.put<CanvasElement>(`/canvases/${canvasId}/elements/${element.id}`, element);
      setData((current) => current ? { ...current, elements: current.elements.map((item) => item.id === saved.id ? saved : item) } : current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画布元素保存失败");
    }
  };

  const updateElement = (element: CanvasElement, save = true) => {
    if (!data) return;
    if (save) {
      setHistory((items) => [...items, data.elements]);
      setFuture([]);
    }
    setData({ ...data, elements: data.elements.map((item) => item.id === element.id ? element : item) });
    if (save) void persist(element);
  };

  const addElement = async (element_type: CanvasElement["element_type"]) => {
    const base = {
      element_type,
      z_index: (data?.elements.length ?? 0) + 1,
      x: 120,
      y: 160,
      width: element_type === "circle" ? 150 : 200,
      height: element_type === "circle" ? 150 : 150,
      rotation: 0,
      locked: false,
      visible: true,
      props: element_type === "text" ? { content: "双击编辑", color: "#111827", fontSize: 36 } : { fill: element_type === "circle" ? "#dc2626" : "#2563eb" },
    };
    try {
      const created = await apiClient.post<CanvasElement>(`/canvases/${canvasId}/elements`, base);
      setData((current) => current ? { ...current, elements: [...current.elements, created] } : current);
      setSelectedId(created.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画布元素创建失败");
    }
  };

  const undo = () => {
    if (!data || history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((items) => [data.elements, ...items]);
    setHistory((items) => items.slice(0, -1));
    setData({ ...data, elements: previous });
  };

  const redo = () => {
    if (!data || future.length === 0) return;
    const next = future[0];
    setHistory((items) => [...items, data.elements]);
    setFuture((items) => items.slice(1));
    setData({ ...data, elements: next });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Panel title="图层与组件">
        <LayerPanel elements={data?.elements ?? []} selectedId={selectedId} setSelectedId={setSelectedId} updateElement={updateElement} />
        <div className="mt-4">
          <ComponentPanel addElement={addElement} />
        </div>
      </Panel>
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <CanvasToolbar title={data?.canvas.title ?? `画布 ${canvasId}`} canvasId={canvasId} zoom={zoom} setZoom={setZoom} undo={undo} redo={redo} />
        {error ? <div className="border-b border-line bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        <CanvasWorkspace canvas={data?.canvas} elements={data?.elements ?? []} selectedId={selectedId} setSelectedId={setSelectedId} updateElement={updateElement} zoom={zoom} />
      </section>
    </div>
  );
}
