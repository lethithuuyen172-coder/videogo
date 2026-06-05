"use client";

export function CanvasWorkspace() {
  return (
    <div className="flex min-h-[680px] items-center justify-center bg-panel">
      <div className="relative h-[560px] w-[315px] bg-white shadow-sm">
        <div className="absolute left-10 top-12 rounded-md bg-accent px-4 py-2 text-sm text-white">产品卖点标题</div>
        <div className="absolute bottom-12 left-8 right-8 h-48 rounded-md border border-dashed border-line" />
      </div>
    </div>
  );
}
