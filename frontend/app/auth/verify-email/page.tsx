"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) setToken(tokenParam);
  }, []);

  const submit = async () => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await apiClient.post("/auth/verify-email", { token: token.trim() });
      setMessage("邮箱验证成功，可以登录继续创作。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "邮箱验证失败");
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
              <MailCheck size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-[#1d1d1f]">验证邮箱</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">粘贴注册后返回的验证 token，激活账号安全状态。</p>
          </div>

          <div className="grid gap-3">
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
            {message ? (
              <div className="rounded-lg bg-[#e7f8ee] p-3 text-sm text-[#248a3d]">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  {message}
                </div>
              </div>
            ) : null}
            <label className="grid gap-1 text-xs font-semibold text-[#86868b]">
              验证 token
              <textarea
                className="min-h-32 rounded-lg border border-black/10 bg-[#f5f5f7] p-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="粘贴 email_verification_token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            <button
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-50"
              disabled={isSubmitting || !token.trim()}
              onClick={submit}
            >
              {isSubmitting ? "验证中" : "验证邮箱"}
              <ArrowRight size={16} />
            </button>
            <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-center text-sm font-semibold text-[#0071e3]" href="/auth/login">去登录</Link>
            <Link className="text-sm font-semibold text-[#0071e3]" href="/auth/register">返回注册</Link>
          </div>
        </div>

        <div className="hidden bg-[#1d1d1f] p-8 text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
            <Sparkles size={14} className="text-[#0a84ff]" />
            Secure creator identity
          </div>
          <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight">把账号状态纳入完整创作工作流。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            验证邮箱后继续使用 Agent、素材、任务、积分和社区发布能力，外部 API 调用也能保持可审计。
          </p>
          <div className="mt-10 grid gap-3 text-sm text-white/72">
            <Feature icon={ShieldCheck} text="账号状态验证" />
            <Feature icon={MailCheck} text="注册 token 验收" />
            <Feature icon={CheckCircle2} text="登录前安全闭环" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3">
      <Icon size={16} className="text-[#0a84ff]" />
      {text}
    </div>
  );
}
