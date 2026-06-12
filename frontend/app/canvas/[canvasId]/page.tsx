"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Layers3, MousePointer2, Sparkles } from "lucide-react";
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

type CreationContext = {
  prompt: string;
  reference: string;
  subject: string;
};

export default function CanvasEditorPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const [data, setData] = useState<CanvasData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(60);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [future, setFuture] = useState<CanvasElement[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creationContext, setCreationContext] = useState<CreationContext>({ prompt: "", reference: "", subject: "" });

  useEffect(() => {
    apiClient.get<CanvasData>(`/canvases/${canvasId}`).then((next) => {
      setData(next);
      setSelectedId(next.elements[0]?.id ?? null);
    }).catch(() => undefined);
  }, [canvasId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCreationContext({
      prompt: params.get("prompt") ?? "",
      reference: params.get("reference") ?? "",
      subject: params.get("subject") ?? "",
    });
  }, []);

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

  const selectedElement = data?.elements.find((element) => element.id === selectedId) ?? null;

  const updateSelectedText = (content: string) => {
    if (!selectedElement || selectedElement.element_type !== "text") return;
    updateElement({ ...selectedElement, props: { ...selectedElement.props, content } });
  };

  const updateSelectedImage = (src: string) => {
    if (!selectedElement || selectedElement.element_type !== "image") return;
    updateElement({ ...selectedElement, props: { ...selectedElement.props, src } });
  };

  const contextPrompt = creationContext.prompt || "从首页、发现页或素材库带入的创作提示会显示在这里。";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold" href="/canvas">
          <ArrowLeft size={16} />
          返回画布
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-[#6e6e73]">
          <Sparkles size={16} className="text-[#0071e3]" />
          {creationContext.subject || data?.canvas.title || "Canvas Studio"}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Layers3 size={17} className="text-[#0071e3]" />
              <h2 className="text-sm font-semibold">图层</h2>
            </div>
            <LayerPanel elements={data?.elements ?? []} selectedId={selectedId} setSelectedId={setSelectedId} updateElement={updateElement} />
          </section>

          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={17} className="text-[#0071e3]" />
              <h2 className="text-sm font-semibold">组件</h2>
            </div>
            <ComponentPanel addElement={addElement} />
          </section>
        </aside>

        <section className="overflow-hidden rounded-lg border border-black/10 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.10)] backdrop-blur-xl">
          <CanvasToolbar title={data?.canvas.title ?? `画布 ${canvasId}`} canvasId={canvasId} zoom={zoom} setZoom={setZoom} undo={undo} redo={redo} />
          {error ? <div className="border-b border-black/10 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div> : null}
          <CanvasWorkspace canvas={data?.canvas} elements={data?.elements ?? []} selectedId={selectedId} setSelectedId={setSelectedId} updateElement={updateElement} zoom={zoom} />
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <MousePointer2 size={17} className="text-[#0071e3]" />
              <h2 className="text-sm font-semibold">选中元素</h2>
            </div>
            {selectedElement ? (
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-lg bg-[#f5f5f7] p-3">
                  <p className="text-xs font-semibold text-[#86868b]">类型</p>
                  <p className="mt-1 font-semibold">{selectedElement.element_type} #{selectedElement.z_index}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-[#86868b]">
                    X
                    <input className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-2 text-sm" type="number" value={Math.round(selectedElement.x)} onChange={(event) => updateElement({ ...selectedElement, x: Number(event.target.value) })} />
                  </label>
                  <label className="text-xs font-semibold text-[#86868b]">
                    Y
                    <input className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-2 text-sm" type="number" value={Math.round(selectedElement.y)} onChange={(event) => updateElement({ ...selectedElement, y: Number(event.target.value) })} />
                  </label>
                </div>
                {selectedElement.element_type === "text" ? (
                  <label className="text-xs font-semibold text-[#86868b]">
                    文案
                    <textarea className="mt-1 min-h-28 w-full rounded-md border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#0071e3]" value={String(selectedElement.props.content ?? "双击编辑")} onChange={(event) => updateSelectedText(event.target.value)} />
                  </label>
                ) : null}
                {selectedElement.element_type === "image" ? (
                  <label className="text-xs font-semibold text-[#86868b]">
                    图片 URL
                    <input className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-2 text-sm outline-none focus:border-[#0071e3]" value={String(selectedElement.props.src ?? "")} onChange={(event) => updateSelectedImage(event.target.value)} />
                  </label>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#f5f5f7] p-4 text-sm leading-6 text-[#6e6e73]">选择一个图层后，可调整位置、文案或图片引用。</p>
            )}
          </section>

          <section className="rounded-lg border border-black/10 bg-[#1d1d1f] p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-2">
              <ImageIcon size={17} className="text-[#5ac8fa]" />
              <h2 className="text-sm font-semibold">创作上下文</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">{contextPrompt}</p>
            {creationContext.reference ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/8">
                <img className="max-h-48 w-full object-cover" src={creationContext.reference} alt="参考素材" />
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Link className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#1d1d1f]" href="/assets">
                素材库
              </Link>
              <Link className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white" href="/long-video">
                长视频
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
