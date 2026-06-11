"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/Panel";
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
          <input
            className="rounded-md border border-line px-3 py-2 text-sm"
            placeholder="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? "更新中" : "更新密码"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
