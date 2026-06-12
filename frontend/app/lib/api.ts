"use client";

import { API_BASE_URL } from "./constants";
import { getSessionOpenAIKey } from "./sessionOpenAIKey";

type ApiOptions = RequestInit & { auth?: boolean };
type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  code: string;
  details: unknown;

  constructor(code: string, message: string, details: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const openaiApiKey = typeof window !== "undefined" ? getSessionOpenAIKey() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (openaiApiKey) headers.set("X-OpenAI-API-Key", openaiApiKey);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await readJson<ApiEnvelope<T>>(res);
  if (!body) {
    throw new ApiError("NETWORK_ERROR", res.statusText || "接口响应格式错误", { status: res.status });
  }
  if (!res.ok) {
    throw new ApiError(
      body.error?.code ?? "HTTP_ERROR",
      body.error?.message ?? res.statusText ?? "接口请求失败",
      body.error?.details ?? { status: res.status },
    );
  }
  if (!body.success) {
    throw new ApiError(
      body.error?.code ?? "API_ERROR",
      body.error?.message ?? "接口请求失败",
      body.error?.details,
    );
  }
  return body.data as T;
}

async function streamRequest(path: string, body?: unknown): Promise<ReadableStream<Uint8Array>> {
  const headers = new Headers();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const openaiApiKey = typeof window !== "undefined" ? getSessionOpenAIKey() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (openaiApiKey) headers.set("X-OpenAI-API-Key", openaiApiKey);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok || !res.body) {
    let message = "流式请求失败";
    const payload = await readJson<ApiEnvelope<unknown>>(res);
    message = payload?.error?.message ?? res.statusText ?? message;
    throw new ApiError("STREAM_ERROR", message, { status: res.status });
  }
  return res.body;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      ...options,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  streamPost: streamRequest,
};
