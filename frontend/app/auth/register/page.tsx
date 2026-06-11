"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Panel } from "@/components/Panel";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效邮箱");
      return;
    }
    try {
      const user = await apiClient.post<{ email_verification_token?: string }>("/auth/register", { email, password });
      setVerifyToken(user.email_verification_token ?? null);
      setMessage("注册成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Panel title="注册">
        <div className="grid gap-3">
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <p className="text-xs text-slate-500">至少8位含大小写字母和数字</p>
          <div className="flex rounded-md border border-line bg-white">
            <input className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" placeholder="密码" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="px-3" onClick={() => setShowPassword(!showPassword)} aria-label="切换密码可见">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            注册
          </button>
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          {message ? <Link className="rounded-md border border-line px-3 py-2 text-center text-sm" href="/auth/login">去登录</Link> : null}
          <Link className="text-sm text-accent" href="/auth/login">已有账号？去登录</Link>
          {verifyToken ? (
            <textarea className="h-24 rounded-md border border-line p-2 text-xs" readOnly value={verifyToken} />
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
