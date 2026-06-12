"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  Compass,
  Crown,
  MessageCircle,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";

const navGroups = [
  {
    title: "创作",
    items: ROUTES.filter((item) => ["/chat", "/video", "/long-video", "/image", "/tasks", "/canvas", "/tools"].includes(item.href)),
  },
  {
    title: "运营",
    items: ROUTES.filter((item) => ["/assets", "/discover", "/works", "/credits", "/account", "/admin"].includes(item.href)),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const mobileRoutes = [
    { href: "/chat", label: "对话", icon: MessageCircle },
    { href: "/video", label: "创作", icon: Video },
    { href: "/discover", label: "发现", icon: Compass },
    { href: "/credits", label: "我的", icon: User },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/10 bg-white/78 px-4 py-5 shadow-[12px_0_40px_rgba(0,0,0,0.04)] backdrop-blur-xl md:block">
        <Link className="mb-6 flex items-center gap-3 rounded-lg px-2" href="/">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1d1d1f] text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-lg font-semibold text-[#1d1d1f]">AI带货视频工厂</div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#86868b]">VideoGo</div>
          </div>
        </Link>

        <Link className="mb-4 flex items-center justify-between rounded-lg bg-[#0071e3] px-3 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.24)]" href="/chat">
          <span className="flex items-center gap-2">
            <MessageCircle size={16} />
            开始创作
          </span>
          <ArrowUpRight size={15} />
        </Link>

        <nav className="grid gap-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{group.title}</div>
              <div className="grid gap-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive(item.href)
                        ? "bg-[#f2f8ff] text-[#0071e3]"
                        : "text-[#424245] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 border-t border-black/10 pt-4 text-sm">
          {user ? (
            <div className="grid gap-3">
              <div className="rounded-lg bg-[#f5f5f7] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b]">
                  <Crown size={14} className="text-[#ff9f0a]" />
                  当前账户
                </div>
                <div className="mt-1 truncate font-semibold text-[#1d1d1f]">{user.email}</div>
                <div className="mt-1 text-xs text-[#86868b]">{user.role} · {user.status}</div>
              </div>
              <button className="rounded-lg border border-black/10 bg-white px-3 py-2 text-left font-semibold text-[#424245]" onClick={logout}>退出</button>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="rounded-lg bg-[#f5f5f7] p-3 text-xs leading-5 text-[#6e6e73]">
                登录后可保存对话、资产、积分和生成历史。
              </div>
              <Link className="rounded-lg border border-black/10 bg-white px-3 py-2 text-center font-semibold text-[#0071e3]" href="/auth/login">登录</Link>
            </div>
          )}
          {isLoading ? <div className="mt-2 text-xs text-[#86868b]">账户同步中...</div> : null}
        </div>
      </aside>

      <main className="min-h-screen px-4 py-4 pb-20 md:ml-64 md:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/88 backdrop-blur-xl md:hidden">
        {mobileRoutes.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} className={`grid place-items-center gap-1 py-2 text-xs font-semibold ${active ? "text-[#0071e3]" : "text-[#6e6e73]"}`} href={item.href}>
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pointer-events-none fixed right-4 top-4 hidden rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs font-semibold text-[#6e6e73] backdrop-blur-xl md:flex md:items-center md:gap-2">
        <Boxes size={14} className="text-[#0071e3]" />
        DA-style workspace
      </div>
    </div>
  );
}
