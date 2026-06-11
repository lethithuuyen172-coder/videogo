"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Send, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);

  const submit = async () => {
    setError(null);
    setSending(true);
    try {
      const data = await apiClient.post<{ reset_token?: string | null }>("/auth/forgot-password", {
        email,
      });
      setResetToken(data.reset_token ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送重置链接失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center">
      <section className="grid w-full overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:grid-cols-[1fr_420px]">
        <div className="hidden bg-[#1d1d1f] p-8 text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
            <Sparkles size={14} className="text-[#0a84ff]" />
            Account recovery
          </div>
          <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight">找回你的创作工作台访问权。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            重置密码后继续管理 Agent 对话、生成任务、素材资产和积分记录。
          </p>
          <div className="mt-10 grid gap-3 text-sm text-white/72">
            <Feature text="邮箱校验" />
            <Feature text="开发环境 token 可见" />
            <Feature text="重置后回到登录页" />
          </div>
        </div>

        <div className="p-6 md:p-8">
          <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]" href="/auth/login">
            <ArrowLeft size={16} />
            返回登录
          </Link>
          <div className="mb-7">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f2f8ff] text-[#0071e3]">
              <KeyRound size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-[#1d1d1f]">重置密码</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">输入注册邮箱，系统会发送重置链接。</p>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              邮箱
              <div className="flex h-12 rounded-lg border border-black/10 bg-[#f5f5f7] focus-within:border-[#0071e3] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0071e3]/10">
                <span className="grid w-11 place-items-center text-[#86868b]"><Mail size={16} /></span>
                <input className="min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50" disabled={isSending} onClick={submit}>
              {isSending ? "发送中" : "发送重置链接"}
              <Send size={16} />
            </button>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
            {sent ? (
              <div className="rounded-lg bg-[#e7f8ee] p-3 text-sm text-[#248a3d]">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  重置链接已发送
                </div>
                <p className="mt-1 text-xs">开发环境 token 如下：{resetToken ?? "无"}</p>
              </div>
            ) : null}
            {resetToken ? (
              <textarea className="h-24 rounded-lg border border-black/10 bg-[#f5f5f7] p-2 text-xs outline-none" readOnly value={resetToken} />
            ) : null}
            <Link className="text-sm font-semibold text-[#0071e3]" href="/auth/login">返回登录</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-lg bg-white/10 px-3 py-3">{text}</div>;
}
