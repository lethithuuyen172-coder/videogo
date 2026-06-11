"use client";

import { Circle, Image, Square, Type } from "lucide-react";
import type { CanvasElement } from "../[canvasId]/page";

const items: Array<{ label: string; type: CanvasElement["element_type"]; icon: typeof Type }> = [
  { label: "添加文字", type: "text", icon: Type },
  { label: "添加矩形", type: "rect", icon: Square },
  { label: "添加圆形", type: "circle", icon: Circle },
  { label: "添加图片", type: "image", icon: Image },
];

export function ComponentPanel({ addElement }: { addElement: (type: CanvasElement["element_type"]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.type} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2" onClick={() => addElement(item.type)}>
            <Icon size={15} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
