"use client";

export function ComponentPanel() {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {["矩形", "圆形", "文字", "图片"].map((item) => (
        <button key={item} className="rounded-md border border-line px-3 py-2">
          {item}
        </button>
      ))}
    </div>
  );
}
