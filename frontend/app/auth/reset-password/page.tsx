"use client";

import { useState } from "react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    await apiClient.post("/auth/reset-password", { token, new_password: newPassword });
    setMessage("密码已更新。");
  };

  return (
    <div className="mx-auto max-w-md">
      <Panel title="设置新密码">
        <div className="grid gap-3">
          <textarea
            className="h-24 rounded-md border border-line px-3 py-2 text-sm"
            placeholder="重置 token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <input
            className="rounded-md border border-line px-3 py-2 text-sm"
            placeholder="新密码"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            更新密码
          </button>
          {message ? <p className="text-sm text-accent">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
