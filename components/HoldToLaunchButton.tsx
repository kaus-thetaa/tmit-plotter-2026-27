"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

const HOLD_DURATION_MS = 2200;

type HoldToLaunchButtonProps = {
  disabled?: boolean;
  onConfirm: () => void;
};

// real safety interlock, must hold the button down through the fill
// before it fires, releasing early cancels and resets progress to zero
export const HoldToLaunchButton = ({
  disabled,
  onConfirm,
}: HoldToLaunchButtonProps) => {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    startRef.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(() => {
    if (startRef.current === null) return;
    const elapsed = performance.now() - startRef.current;
    const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
    setProgress(pct);
    if (pct >= 1) {
      cancel();
      onConfirm();
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
  }, [cancel, onConfirm]);

  const start = useCallback(() => {
    if (disabled) return;
    startRef.current = performance.now();
    frameRef.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  useEffect(() => cancel, [cancel]);

  const pct = Math.round(progress * 100);

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      disabled={disabled}
      className="relative panel px-5 py-2 text-sm overflow-hidden select-none disabled:opacity-30 hover:border-console-critical/60"
    >
      <span
        className="absolute inset-y-0 left-0 bg-console-critical/40 transition-[width] duration-75 ease-linear"
        style={{ width: `${pct}%` }}
      />
      <span className="relative flex items-center gap-2">
        <Lock size={14} />
        hold to launch
      </span>
    </button>
  );
};
