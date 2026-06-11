"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { token, new_password: newPassword });
      setMessage("密码已更新。");
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置密码失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center">
      <section className="grid w-full overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:grid-cols-[420px_1fr]">
        <div className="p-6 md:p-8">
          <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]" href="/auth/login">
            <ArrowLeft size={16} />
            返回登录
          </Link>
          <div className="mb-7">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f2f8ff] text-[#0071e3]">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-[#1d1d1f]">设置新密码</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">粘贴重置 token，并设置新的工作台登录密码。</p>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              重置 token
              <textarea
                className="h-24 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 py-2 text-sm outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="重置 token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              新密码
              <input
                className="h-12 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="新密码"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              确认密码
              <input
                className="h-12 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 text-sm outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="确认密码"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50" disabled={isSubmitting} onClick={submit}>
              <KeyRound size={16} />
              {isSubmitting ? "更新中" : "更新密码"}
            </button>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
            {message ? (
              <div className="flex items-center gap-2 rounded-lg bg-[#e7f8ee] p-3 text-sm font-semibold text-[#248a3d]">
                <CheckCircle2 size={16} />
                {message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden bg-[#1d1d1f] p-8 text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
            <Sparkles size={14} className="text-[#0a84ff]" />
            Secure workspace
          </div>
          <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight">重新保护你的素材和积分资产。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            密码更新后会回到登录页，继续进入 DA 类创作工作台。
          </p>
          <div className="mt-10 grid gap-3 text-sm text-white/72">
            <Feature text="校验两次密码一致" />
            <Feature text="调用 /auth/reset-password" />
            <Feature text="成功后返回登录页" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-lg bg-white/10 px-3 py-3">{text}</div>;
}
