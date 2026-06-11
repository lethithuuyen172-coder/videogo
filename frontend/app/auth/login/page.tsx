"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center">
      <section className="grid w-full overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:grid-cols-[1fr_420px]">
        <div className="hidden bg-[#1d1d1f] p-8 text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">
            <Sparkles size={14} className="text-[#0a84ff]" />
            VideoGo Creative OS
          </div>
          <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight">回到你的 AI 带货创作台。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">
            登录后继续使用 Agent、视频、图片、画布、资产和积分能力，把 DA 类创作流程沉淀成可复用带货工作流。
          </p>
          <div className="mt-10 grid gap-3 text-sm text-white/72">
            <Feature text="保存对话和生成历史" />
            <Feature text="管理素材资产和积分消耗" />
            <Feature text="继续视频、图片、画布任务" />
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-7">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f2f8ff] text-[#0071e3]">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-[#1d1d1f]">登录</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">进入工作台，继续你的商品素材生成链路。</p>
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
              {isSubmitting ? "登录中" : "登录"}
              <ArrowRight size={16} />
            </button>
            <div className="flex items-center justify-between gap-3 text-sm">
              <Link className="font-semibold text-[#0071e3]" href="/auth/register">没有账号？去注册</Link>
              <Link className="text-[#6e6e73]" href="/auth/forgot-password">忘记密码</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-lg bg-white/10 px-3 py-3">{text}</div>;
}
