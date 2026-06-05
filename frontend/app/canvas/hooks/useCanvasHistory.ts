"use client";

import { useCallback, useState } from "react";

export function useCanvasHistory<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);
  const state = history[index];

  const pushState = useCallback(
    (next: T) => {
      setHistory((items) => [...items.slice(0, index + 1), next].slice(-50));
      setIndex((value) => Math.min(value + 1, 49));
    },
    [index],
  );

  const undo = () => setIndex((value) => Math.max(0, value - 1));
  const redo = () => setIndex((value) => Math.min(history.length - 1, value + 1));

  return { state, pushState, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}
