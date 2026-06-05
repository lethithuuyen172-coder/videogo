"use client";

export function ImagePreview({ url, progress }: { url?: string; progress: number }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-md border border-line bg-white p-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="max-h-[500px] rounded-md object-contain" src={url} alt="生成图片" />
      ) : (
        <div className="text-center text-sm text-slate-500">等待生成任务，当前进度 {progress}%</div>
      )}
    </div>
  );
}
