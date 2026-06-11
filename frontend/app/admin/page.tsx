"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import { Panel } from "@/components/Panel";
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
    { label: "用户", value: stats?.users },
    { label: "素材", value: stats?.materials },
    { label: "视频任务", value: stats?.video_jobs },
    { label: "图片任务", value: stats?.image_jobs },
    { label: "待审核", value: stats?.pending_reviews },
  ];

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
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">管理后台</h1>
        <p className="mt-1 text-sm text-slate-500">用户、审核、Provider 与平台运行摘要。</p>
      </div>

      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error === "权限不足" ? "需要管理员权限" : error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((item) => (
          <Panel key={item.label}>
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold">{item.value ?? "--"}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="用户管理">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <UsersRound size={16} />
            最近 100 个用户
          </div>
          <div className="grid gap-2">
            {users.length === 0 ? <p className="text-sm text-slate-500">暂无用户数据</p> : null}
            {users.slice(0, 8).map((user) => (
              <div key={user.id} className="grid grid-cols-[1fr_80px_80px_64px] gap-2 border-b border-line py-2 text-sm">
                <span className="truncate">{user.email}</span>
                <span>{user.role}</span>
                <span>{user.status}</span>
                <button className="rounded-md border border-line px-2 py-1 text-red-600" onClick={() => suspend(user)}>封禁</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="内容审核">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={16} />
            待审核作品队列
          </div>
          <div className="grid gap-2">
            {works.length === 0 ? <p className="text-sm text-slate-500">暂无待审核作品</p> : null}
            {works.slice(0, 8).map((work) => (
              <div key={work.id} className="grid grid-cols-[1fr_72px_96px] gap-2 border-b border-line py-2 text-sm">
                <span className="truncate">{work.title}</span>
                <span>{work.work_type}</span>
                <span className="flex gap-1">
                  <button className="rounded-md border border-line px-2 py-1 text-accent" onClick={() => moderate(work, "published")}>通过</button>
                  <button className="rounded-md border border-line px-2 py-1 text-red-600" onClick={() => moderate(work, "rejected")}>拒绝</button>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Provider账号池">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <SlidersHorizontal size={16} />
          模型服务状态与优先级
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {providers.length === 0 ? <p className="text-sm text-slate-500">暂无 Provider 数据</p> : null}
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border border-line p-3 text-sm">
              <div className="font-medium">{provider.provider_key}</div>
              <div className="mt-1 text-xs text-slate-500">{provider.modality}</div>
              <div className="mt-3 flex justify-between text-xs">
                <span>{provider.status}</span>
                <span>优先级 {provider.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
