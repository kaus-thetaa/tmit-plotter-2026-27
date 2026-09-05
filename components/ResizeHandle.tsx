"use client";

import { useCallback, useRef } from "react";

type ResizeHandleProps = {
  onResize: (deltaX: number) => void;
};

// thin draggable divider between a sidebar and the main content,
// reports the horizontal delta each frame so the caller can update
// whatever width state it owns
export const ResizeHandle = ({ onResize }: ResizeHandleProps) => {
  const lastXRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      lastXRef.current = e.clientX;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - lastXRef.current;
        lastXRef.current = moveEvent.clientX;
        onResize(delta);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onResize]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className="w-1.5 shrink-0 cursor-col-resize bg-console-border/10 hover:bg-console-accent/40 transition-colors"
    />
  );
};
