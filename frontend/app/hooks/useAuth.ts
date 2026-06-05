"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type User = {
  id: string;
  email: string;
  role: string;
  status: string;
  credit_balance: number;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return setUser(null);
      setUser(await apiClient.get<User>("/auth/me"));
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = async (email: string, password: string) => {
    const tokens = await apiClient.post<{ access_token: string; refresh_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    await load();
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return { user, isLoading, isAuthenticated: Boolean(user), login, logout };
}
