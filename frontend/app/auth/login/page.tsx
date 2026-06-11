"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Panel } from "@/components/Panel";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
          <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <div className="flex rounded-md border border-line bg-white">
            <input className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" placeholder="密码" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="px-3" onClick={() => setShowPassword(!showPassword)} aria-label="切换密码可见">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={submit}>
            登录
          </button>
          <Link className="text-sm text-accent" href="/auth/register">没有账号？去注册</Link>
        </div>
      </Panel>
    </div>
  );
}
