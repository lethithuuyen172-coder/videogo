"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { Panel } from "@/components/Panel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const submit = async () => {
    const data = await apiClient.post<{ reset_token?: string | null }>("/auth/forgot-password", {
      email,
    });
    setResetToken(data.reset_token ?? null);
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md">
      <Panel title="重置密码">
        <div className="grid gap-3">
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            发送重置链接
          </button>
          {sent ? <p className="text-sm text-accent">重置链接 24 小时内有效。</p> : null}
          {resetToken ? (
            <textarea className="h-24 rounded-md border border-line p-2 text-xs" readOnly value={resetToken} />
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
