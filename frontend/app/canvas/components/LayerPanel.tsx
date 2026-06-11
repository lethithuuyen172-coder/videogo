"use client";

import { ArrowDown, ArrowUp, Circle, Eye, EyeOff, Image, Lock, Square, Type, Unlock } from "lucide-react";
import type { CanvasElement } from "../[canvasId]/page";

const icons = { text: Type, rect: Square, circle: Circle, image: Image, line: Square };

export function LayerPanel({
  elements,
  selectedId,
  setSelectedId,
  updateElement,
}: {
  elements: CanvasElement[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  updateElement: (element: CanvasElement) => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      {elements.sort((a, b) => b.z_index - a.z_index).map((element) => {
        const Icon = icons[element.element_type];
        return (
          <div key={element.id} className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-1 rounded-md px-2 py-2 ${selectedId === element.id ? "bg-panel" : "bg-white"}`}>
            <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => setSelectedId(element.id)}>
              <Icon size={15} />
              <span className="truncate">{element.element_type} #{element.z_index}</span>
            </button>
            <button className="rounded-md border border-line p-1" onClick={() => updateElement({ ...element, visible: !element.visible })} aria-label="切换可见">
              {element.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button className="rounded-md border border-line p-1" onClick={() => updateElement({ ...element, locked: !element.locked })} aria-label="切换锁定">
              {element.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button className="rounded-md border border-line p-1" onClick={() => updateElement({ ...element, z_index: element.z_index + 1 })} aria-label="上移图层">
              <ArrowUp size={14} />
            </button>
            <button className="rounded-md border border-line p-1" onClick={() => updateElement({ ...element, z_index: Math.max(0, element.z_index - 1) })} aria-label="下移图层">
              <ArrowDown size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
