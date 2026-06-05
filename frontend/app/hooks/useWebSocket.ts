"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MessageHandler = (payload: unknown) => void;

export function useWebSocket(url: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const [isConnected, setConnected] = useState(false);

  useEffect(() => {
    let closedByHook = false;

    const connect = () => {
      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        if (!closedByHook) window.setTimeout(connect, 1500);
      };
      socket.onmessage = (event) => {
        const payload = safeParse(event.data);
        handlersRef.current.forEach((handler) => handler(payload));
      };
    };

    connect();
    return () => {
      closedByHook = true;
      socketRef.current?.close();
    };
  }, [url]);

  const send = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  return { send, onMessage, isConnected };
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
