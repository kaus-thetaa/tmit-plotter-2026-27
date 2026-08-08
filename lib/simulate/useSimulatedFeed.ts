"use client";

import { useCallback, useRef, useState } from "react";

export const useSimulatedFeed = <T,>(
  generate: (elapsedSeconds: number) => T,
  onTick: (data: T) => void,
  intervalMs = 100
) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateRef = useRef(generate);
  generateRef.current = generate;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const start = useCallback(() => {
    if (timerRef.current) return;
    startRef.current = performance.now();
    setIsSimulating(true);
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - (startRef.current ?? 0)) / 1000;
      onTickRef.current(generateRef.current(elapsed));
    }, intervalMs);
  }, [intervalMs]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    setIsSimulating(false);
  }, []);

  return { isSimulating, start, stop };
};
