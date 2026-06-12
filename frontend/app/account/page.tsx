"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, CreditCard, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, UserRound } from "lucide-react";
import { OpenAIKeyBox } from "@/components/OpenAIKeyBox";
import { apiClient } from "@/lib/api";

type UserInfo = {
  id: string;
  email: string;
  display_name?: string | null;
  role: string;
  status: string;
  credit_balance: number;
  frozen_credits: number;
  created_at: string;
};

type APIKey = {
  id: string;
  name: string;
  key_prefix: string;
  plain_key?: string | null;
  revoked_at?: string | null;
  created_at: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("VideoGo API Key");
  const [createdPlainKey, setCreatedPlainKey] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isCreating, setCreating] = useState(false);
  const [isChangingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, keys] = await Promise.all([
        apiClient.get<UserInfo>("/auth/me"),
        apiClient.get<APIKey[]>("/auth/api-keys"),
      ]);
      setUser(me);
      setApiKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "账号信息加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeKeys = useMemo(() => apiKeys.filter((key) => !key.revoked_at), [apiKeys]);

  const createApiKey = async () => {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await apiClient.post<APIKey>("/auth/api-keys", { name: newKeyName.trim() || "VideoGo API Key" });
      setApiKeys((items) => [created, ...items]);
      setCreatedPlainKey(created.plain_key ?? "");
      setNotice("API Key 已创建，明文只会显示这一次。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "API Key 创建失败");
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (key: APIKey) => {
    if (!confirm(`确认撤销 ${key.name}？撤销后无法恢复。`)) return;
    setError(null);
    try {
      await apiClient.delete(`/auth/api-keys/${key.id}`);
      setApiKeys((items) => items.map((item) => item.id === key.id ? { ...item, revoked_at: new Date().toISOString() } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "API Key 撤销失败");
    }
  };

  const changePassword = async () => {
    setChangingPassword(true);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post("/auth/change-password", { old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      setNotice("密码已更新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "密码修改失败");
    } finally {
      setChangingPassword(false);
    }
  };

  const copyPlainKey = async () => {
    if (!createdPlainKey) return;
    await navigator.clipboard.writeText(createdPlainKey);
    setNotice("API Key 已复制。");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Account</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">账号设置</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              管理登录账号、平台 API Key、本机 OpenAI Key、密码安全和积分入口，让 DA 类工作台可以被浏览器和外部系统同时调用。
            </p>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3]" onClick={load} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            刷新
          </button>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-lg border border-green-100 bg-[#e7f8ee] p-4 text-sm text-[#248a3d]">{notice}</div> : null}

      <section className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid h-fit gap-4">
          <section className="rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1d1d1f]">
                <UserRound size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user?.display_name || user?.email || "未登录账号"}</p>
                <p className="mt-1 text-xs text-white/55">{user?.role ?? "guest"} · {user?.status ?? "unknown"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white/8 p-3">
                <p className="text-xs text-white/55">可用积分</p>
                <p className="mt-2 text-2xl font-semibold">{user?.credit_balance ?? "--"}</p>
              </div>
              <div className="rounded-lg bg-white/8 p-3">
                <p className="text-xs text-white/55">冻结积分</p>
                <p className="mt-2 text-2xl font-semibold">{user?.frozen_credits ?? "--"}</p>
              </div>
            </div>
            <Link className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#1d1d1f]" href="/credits">
              <CreditCard size={16} />
              查看积分与套餐
            </Link>
          </section>

          <OpenAIKeyBox />

          <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2">
              <LockKeyhole size={17} className="text-[#0071e3]" />
              <h2 className="text-sm font-semibold">修改密码</h2>
            </div>
            <label className="mt-4 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              当前密码
              <input className="control" type={showPassword ? "text" : "password"} value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
            </label>
            <label className="mt-3 grid gap-1 text-xs font-semibold text-[#6e6e73]">
              新密码
              <input className="control" type={showPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少8位，含大小写字母和数字" />
            </label>
            <button className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#0071e3]" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              {showPassword ? "隐藏密码" : "显示密码"}
            </button>
            <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-sm font-semibold text-white disabled:opacity-50" disabled={isChangingPassword || !oldPassword || !newPassword} onClick={changePassword}>
              {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              保存密码
            </button>
          </section>
        </aside>

        <main className="rounded-lg border border-black/10 bg-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="border-b border-black/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">平台 API Key</h2>
                <p className="mt-1 text-xs text-[#86868b]">用于脚本、自动化或外部系统通过 `X-API-Key` 调用你的工作台。</p>
              </div>
              <span className="rounded-full bg-[#f2f8ff] px-3 py-1 text-xs font-semibold text-[#0071e3]">{activeKeys.length} 个可用</span>
            </div>
          </div>

          <div className="grid gap-4 p-4">
            <div className="rounded-lg border border-black/10 bg-[#f5f5f7] p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <input className="control bg-white" value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} placeholder="给 Key 起个名字" />
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-50" disabled={isCreating} onClick={createApiKey}>
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  创建 Key
                </button>
              </div>
              {createdPlainKey ? (
                <div className="mt-4 rounded-lg border border-[#0071e3]/20 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#0071e3]">
                    <CheckCircle2 size={15} />
                    只显示一次
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_100px]">
                    <code className="overflow-hidden rounded-md bg-[#1d1d1f] px-3 py-2 text-xs text-white">{createdPlainKey}</code>
                    <button className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-xs font-semibold text-[#0071e3]" onClick={copyPlainKey}>
                      <Copy size={14} />
                      复制
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {isLoading ? (
              <div className="grid min-h-64 place-items-center text-sm text-[#86868b]">
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#0071e3]" />
                  同步 API Key
                </span>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-black/15 text-center text-sm text-[#86868b]">
                <div>
                  <Sparkles className="mx-auto text-[#0071e3]" size={22} />
                  <p className="mt-3 font-semibold text-[#1d1d1f]">还没有平台 API Key</p>
                  <p className="mt-2">创建后可让自动化系统调用素材、任务和生成接口。</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10">
                {apiKeys.map((key) => (
                  <div key={key.id} className="grid gap-3 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <KeyRound size={16} className="text-[#0071e3]" />
                        <h3 className="truncate text-sm font-semibold">{key.name}</h3>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${key.revoked_at ? "bg-red-50 text-red-600" : "bg-[#e7f8ee] text-[#248a3d]"}`}>
                          {key.revoked_at ? "已撤销" : "可用"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#86868b]">{key.key_prefix} · 创建于 {formatDate(key.created_at)}</p>
                    </div>
                    <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-xs font-semibold text-red-600 disabled:opacity-40" disabled={Boolean(key.revoked_at)} onClick={() => revokeApiKey(key)}>
                      <Trash2 size={14} />
                      撤销
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </section>

      <style jsx>{`
        .control {
          height: 44px;
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #f5f5f7;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }
        .control:focus {
          border-color: #0071e3;
          background: white;
          box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
        }
      `}</style>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
