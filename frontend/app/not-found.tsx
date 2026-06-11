import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <div className="text-6xl font-semibold">404</div>
        <p className="mt-3 text-slate-500">页面不存在</p>
        <Link className="mt-4 inline-block rounded-md bg-accent px-3 py-2 text-sm text-white" href="/">返回首页</Link>
      </div>
    </div>
  );
}
