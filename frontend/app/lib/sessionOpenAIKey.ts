"use client";

let sessionOpenAIKey = "";

export function getSessionOpenAIKey(): string {
  return sessionOpenAIKey;
}

export function setSessionOpenAIKey(value: string): void {
  sessionOpenAIKey = value.trim();
  window.dispatchEvent(new Event("openai-api-key-updated"));
}

export function clearSessionOpenAIKey(): void {
  sessionOpenAIKey = "";
  window.dispatchEvent(new Event("openai-api-key-updated"));
}
