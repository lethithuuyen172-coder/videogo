"use client";

import Link from "next/link";
import { Compass, MessageCircle, User, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const mobileRoutes = [
    { href: "/chat", label: "对话", icon: MessageCircle },
    { href: "/video", label: "创作", icon: Video },
    { href: "/discover", label: "发现", icon: Compass },
    { href: "/credits", label: "我的", icon: User },
  ];

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
        <div className="absolute bottom-5 left-4 right-4 border-t border-line pt-4 text-sm">
          {user ? (
            <div className="grid gap-2">
              <div className="truncate text-slate-500">{user.email}</div>
              <button className="rounded-md border border-line px-3 py-2 text-left" onClick={logout}>退出</button>
            </div>
          ) : (
            <Link className="rounded-md border border-line px-3 py-2" href="/auth/login">登录</Link>
          )}
        </div>
      </aside>
      <main className="min-h-screen px-4 py-4 pb-20 md:ml-56 md:px-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white md:hidden">
        {mobileRoutes.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} className="grid place-items-center gap-1 py-2 text-xs" href={item.href}>
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
