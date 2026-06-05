import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-line bg-white px-4 py-5 md:block">
        <div className="mb-6 text-lg font-semibold">AI带货视频工厂</div>
        <nav className="grid gap-1">
          {ROUTES.map((item) => (
            <Link key={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-panel" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-h-screen px-4 py-4 md:ml-56 md:px-6">{children}</main>
    </div>
  );
}
