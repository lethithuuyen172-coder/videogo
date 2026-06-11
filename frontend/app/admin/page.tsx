"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  Check,
  CircleDollarSign,
  Image as ImageIcon,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  UserX,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type DashboardStats = {
  users: number;
  materials: number;
  video_jobs: number;
  image_jobs: number;
  pending_reviews: number;
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  credit_balance: number;
};

type ModerationWork = {
  id: string;
  title: string;
  work_type: string;
  status: string;
};

type ProviderAccount = {
  id: string;
  provider_key: string;
  modality: string;
  status: string;
  priority: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [works, setWorks] = useState<ModerationWork[]>([]);
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<DashboardStats>("/admin/dashboard"),
      apiClient.get<AdminUser[]>("/admin/users"),
      apiClient.get<ModerationWork[]>("/admin/moderation/works"),
      apiClient.get<ProviderAccount[]>("/admin/provider-accounts"),
    ])
      .then(([nextStats, nextUsers, nextWorks, nextProviders]) => {
        setStats(nextStats);
        setUsers(nextUsers);
        setWorks(nextWorks);
        setProviders(nextProviders);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "管理后台加载失败"));
  }, []);

  const statCards = [
    { label: "用户", value: stats?.users, icon: UsersRound, color: "text-[#0071e3]" },
    { label: "素材", value: stats?.materials, icon: Boxes, color: "text-[#34c759]" },
    { label: "视频任务", value: stats?.video_jobs, icon: Video, color: "text-[#ff9f0a]" },
    { label: "图片任务", value: stats?.image_jobs, icon: ImageIcon, color: "text-[#af52de]" },
    { label: "待审核", value: stats?.pending_reviews, icon: ShieldCheck, color: "text-[#ff375f]" },
  ];

  const activeProviders = useMemo(() => providers.filter((item) => item.status === "active" || item.status === "enabled").length, [providers]);
  const suspendedUsers = useMemo(() => users.filter((item) => item.status === "suspended").length, [users]);

  const suspend = async (user: AdminUser) => {
    setError(null);
    try {
      await apiClient.put(`/admin/users/${user.id}`, { status: "suspended" });
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, status: "suspended" } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "封禁用户失败");
    }
  };

  const moderate = async (work: ModerationWork, status: "published" | "rejected") => {
    setError(null);
    try {
      await apiClient.post(`/admin/moderation/works/${work.id}`, { status });
      setWorks((items) => items.filter((item) => item.id !== work.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "审核操作失败");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="grid gap-5 rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl xl:grid-cols-[1fr_340px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Admin Console</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">管理后台</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
            运营用户、内容审核、Provider 账号池和平台运行摘要，支撑 DA 类生成站从创作到商业化的稳定运转。
          </p>
        </div>
        <div className="rounded-lg bg-[#1d1d1f] p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Activity size={18} className="text-[#0a84ff]" />
            运行状态
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <Health label="待审核作品" value={`${stats?.pending_reviews ?? "--"}`} />
            <Health label="可用 Provider" value={`${activeProviders}/${providers.length || "--"}`} />
            <Health label="封禁用户" value={`${suspendedUsers}`} />
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error === "权限不足" ? "需要管理员权限" : error}</div> : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#86868b]">{item.label}</div>
                <Icon size={17} className={item.color} />
              </div>
              <div className="mt-3 text-3xl font-semibold">{item.value ?? "--"}</div>
            </div>
          );
        })}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Panel title="用户管理" icon={UsersRound} aside="最近 100 个用户">
          <div className="overflow-hidden rounded-lg border border-black/10">
            <div className="grid grid-cols-[minmax(0,1fr)_88px_88px_92px_72px] bg-[#f5f5f7] px-3 py-2 text-xs font-semibold text-[#86868b]">
              <span>邮箱</span>
              <span>角色</span>
              <span>状态</span>
              <span>积分</span>
              <span>操作</span>
            </div>
            {users.length === 0 ? <p className="p-4 text-sm text-[#86868b]">暂无用户数据</p> : null}
            {users.slice(0, 10).map((user) => (
              <div key={user.id} className="grid grid-cols-[minmax(0,1fr)_88px_88px_92px_72px] items-center border-t border-black/10 px-3 py-3 text-sm">
                <span className="truncate font-semibold">{user.email}</span>
                <span className="text-[#6e6e73]">{user.role}</span>
                <StatusPill value={user.status} />
                <span className="inline-flex items-center gap-1 text-[#6e6e73]">
                  <CircleDollarSign size={14} className="text-[#0071e3]" />
                  {user.credit_balance}
                </span>
                <button className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-black/10 bg-white px-2 text-xs font-semibold text-red-600 disabled:opacity-40" disabled={user.status === "suspended"} onClick={() => suspend(user)}>
                  <UserX size={13} />
                  封禁
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="内容审核" icon={ShieldCheck} aside="待审核作品队列">
          <div className="grid gap-2">
            {works.length === 0 ? <p className="rounded-lg border border-dashed border-black/15 p-5 text-sm text-[#86868b]">暂无待审核作品</p> : null}
            {works.slice(0, 8).map((work) => (
              <div key={work.id} className="rounded-lg border border-black/10 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{work.title}</div>
                    <div className="mt-1 text-xs text-[#86868b]">{work.work_type} · {work.status}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-[#e7f8ee] text-[#248a3d]" onClick={() => moderate(work, "published")} aria-label="通过">
                      <Check size={15} />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-600" onClick={() => moderate(work, "rejected")} aria-label="拒绝">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5 rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal size={17} className="text-[#0071e3]" />
            Provider账号池
          </div>
          <div className="text-xs text-[#86868b]">模型服务状态与优先级</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {providers.length === 0 ? <p className="text-sm text-[#86868b]">暂无 Provider 数据</p> : null}
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-black/10 bg-[#fbfbfd] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{provider.provider_key}</div>
                  <div className="mt-1 text-xs text-[#86868b]">{provider.modality}</div>
                </div>
                <RadioTower size={18} className={provider.status === "active" || provider.status === "enabled" ? "text-[#30d158]" : "text-[#86868b]"} />
              </div>
              <div className="mt-4 flex justify-between rounded-lg bg-white px-3 py-2 text-xs">
                <span>{provider.status}</span>
                <span className="font-semibold text-[#1d1d1f]">优先级 {provider.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, icon: Icon, aside, children }: { title: string; icon: typeof UsersRound; aside: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={17} className="text-[#0071e3]" />
          {title}
        </div>
        <div className="text-xs text-[#86868b]">{aside}</div>
      </div>
      {children}
    </section>
  );
}

function StatusPill({ value }: { value: string }) {
  const active = value === "active" || value === "enabled";
  return (
    <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-[#e7f8ee] text-[#248a3d]" : "bg-[#f5f5f7] text-[#86868b]"}`}>
      {value}
    </span>
  );
}

function Health({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-3">
      <span className="text-white/65">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
