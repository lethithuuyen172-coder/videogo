"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { Panel } from "@/components/Panel";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  const submit = async () => {
    const user = await apiClient.post<{ email_verification_token?: string }>("/auth/register", { email, password });
    setVerifyToken(user.email_verification_token ?? null);
    setMessage("注册成功，请登录。");
  };

  return (
    <div className="mx-auto max-w-md">
      <Panel title="注册">
        <div className="grid gap-3">
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            注册
          </button>
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          {verifyToken ? (
            <textarea className="h-24 rounded-md border border-line p-2 text-xs" readOnly value={verifyToken} />
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
