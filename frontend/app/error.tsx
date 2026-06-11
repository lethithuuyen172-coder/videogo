"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <div className="text-xl font-semibold">页面出错</div>
        <p className="mt-3 text-sm text-red-600">{error.message}</p>
        <button className="mt-4 rounded-md bg-accent px-3 py-2 text-sm text-white" onClick={reset}>重试</button>
      </div>
    </div>
  );
}
