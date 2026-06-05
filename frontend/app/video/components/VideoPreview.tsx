"use client";

export function VideoPreview({ url, progress }: { url?: string; progress: number }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-md border border-line bg-ink p-4 text-white">
      {url ? (
        <video className="max-h-[500px] w-full rounded-md" src={url} controls />
      ) : (
        <div className="text-center text-sm text-slate-300">等待生成任务，当前进度 {progress}%</div>
      )}
    </div>
  );
}
