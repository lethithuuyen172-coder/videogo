"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效邮箱");
      return;
    }
    setSubmitting(true);
    try {
      const user = await apiClient.post<{ email_verification_token?: string }>("/auth/register", { email, password });
      setVerifyToken(user.email_verification_token ?? null);
      setMessage("注册成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center">
      <section className="grid w-full overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:grid-cols-[420px_1fr]">
        <div className="p-6 md:p-8">
          <div className="mb-7">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f2f8ff] text-[#0071e3]">
              <ShieldCheck size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-[#1d1d1f]">注册</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">创建账号后可保存素材、积分、任务和 Agent 对话。</p>
          </div>

          <div className="grid gap-3">
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              邮箱
              <input
                className="h-12 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="邮箱"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <p className="text-xs text-[#86868b]">至少8位含大小写字母和数字</p>
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              密码
              <div className="flex h-12 rounded-lg border border-black/10 bg-[#f5f5f7] focus-within:border-[#0071e3] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0071e3]/10">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                  placeholder="密码"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button className="px-3 text-[#86868b]" onClick={() => setShowPassword(!showPassword)} aria-label="切换密码可见">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50"
              disabled={isSubmitting}
              onClick={submit}
            >
              {isSubmitting ? "创建中" : "注册"}
              <ArrowRight size={16} />
            </button>
            {message ? (
              <div className="rounded-lg bg-[#e7f8ee] p-3 text-sm text-[#248a3d]">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  {message}
                </div>
                <p className="mt-1 text-xs">开发环境会直接返回邮箱验证 token，便于本地验收。</p>
              </div>
            ) : null}
            {message ? (
              <div className="grid grid-cols-2 gap-2">
                <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-center text-sm font-semibold text-[#0071e3]" href="/auth/login">去登录</Link>
                <Link className="rounded-full bg-[#1d1d1f] px-3 py-2 text-center text-sm font-semibold text-white" href={`/auth/verify-email${verifyToken ? `?token=${encodeURIComponent(verifyToken)}` : ""}`}>验证邮箱</Link>
              </div>
            ) : null}
            <Link className="text-sm font-semibold text-[#0071e3]" href="/auth/login">已有账号？去登录</Link>
            {verifyToken ? (
              <textarea className="h-24 rounded-lg border border-black/10 bg-[#f5f5f7] p-2 text-xs outline-none" readOnly value={verifyToken} />
            ) : null}
          </div>
        </div>

        <div className="hidden bg-[#1d1d1f] p-8 text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
            <Sparkles size={14} className="text-[#0a84ff]" />
            Creator account
          </div>
          <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight">把 DA 类能力变成你的带货素材工厂。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            注册后可以沉淀商品资产、视频脚本、图片提示词、画布模板和积分记录，继续面向投放转化迭代。
          </p>
          <div className="mt-10 grid gap-3 text-sm text-white/72">
            <Feature text="Agent 生成带货脚本" />
            <Feature text="图片、视频和长视频任务" />
            <Feature text="素材资产与社区模板" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-lg bg-white/10 px-3 py-3">{text}</div>;
}
