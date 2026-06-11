"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import type { CanvasElement } from "../[canvasId]/page";

export function CanvasWorkspace({
  canvas,
  elements,
  selectedId,
  setSelectedId,
  updateElement,
  zoom,
}: {
  canvas?: { width: number; height: number; background_color: string };
  elements: CanvasElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateElement: (element: CanvasElement, save?: boolean) => void;
  zoom: number;
}) {
  const scale = zoom / 100;
  const width = canvas?.width ?? 1080;
  const height = canvas?.height ?? 1920;

  const startDrag = (event: ReactMouseEvent<HTMLDivElement>, element: CanvasElement) => {
    if (element.locked) return;
    event.preventDefault();
    setSelectedId(element.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = element.x;
    const originY = element.y;

    const move = (moveEvent: MouseEvent) => {
      const next = {
        ...element,
        x: originX + (moveEvent.clientX - startX) / scale,
        y: originY + (moveEvent.clientY - startY) / scale,
      };
      updateElement(next, false);
    };
    const up = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      updateElement({
        ...element,
        x: originX + (upEvent.clientX - startX) / scale,
        y: originY + (upEvent.clientY - startY) / scale,
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="flex min-h-[680px] items-center justify-center overflow-auto bg-panel p-8">
      <div
        className="relative origin-center shadow-sm"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          backgroundColor: canvas?.background_color ?? "#ffffff",
        }}
        onMouseDown={() => setSelectedId(null)}
      >
        {elements.filter((element) => element.visible).sort((a, b) => a.z_index - b.z_index).map((element) => {
          const selected = selectedId === element.id;
          return (
            <div
              key={element.id}
              className={selected ? "absolute border-2 border-dashed border-blue-500" : "absolute"}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
                zIndex: element.z_index,
                cursor: element.locked ? "not-allowed" : "move",
              }}
              onMouseDown={(event) => startDrag(event, element)}
            >
              {element.element_type === "text" ? (
                <div style={{ color: String(element.props.color ?? "#111827"), fontSize: Number(element.props.fontSize ?? 36) }}>
                  {String(element.props.content ?? "双击编辑")}
                </div>
              ) : null}
              {element.element_type === "rect" ? <div className="h-full w-full" style={{ backgroundColor: String(element.props.fill ?? "#2563eb") }} /> : null}
              {element.element_type === "circle" ? <div className="h-full w-full rounded-full" style={{ backgroundColor: String(element.props.fill ?? "#dc2626") }} /> : null}
              {element.element_type === "image" ? <img className="h-full w-full object-cover" src={String(element.props.src ?? "https://placehold.co/400x300")} alt="" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
