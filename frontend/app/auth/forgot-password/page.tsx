"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Panel } from "@/components/Panel";

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
    <div className="mx-auto max-w-md">
      <Panel title="重置密码">
        <div className="grid gap-3">
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isSending} onClick={submit}>
            {isSending ? "发送中" : "发送重置链接"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {sent ? <p className="text-sm text-accent">重置链接已发送（开发环境 token 如下：{resetToken ?? "无"}）</p> : null}
          {resetToken ? (
            <textarea className="h-24 rounded-md border border-line p-2 text-xs" readOnly value={resetToken} />
          ) : null}
          <Link className="text-sm text-accent" href="/auth/login">返回登录</Link>
        </div>
      </Panel>
    </div>
  );
}
