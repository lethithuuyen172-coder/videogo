"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/Panel";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      await login(email, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Panel title="登录">
        <div className="grid gap-3">
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            登录
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
