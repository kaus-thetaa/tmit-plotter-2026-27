"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type ExpandablePanelProps = {
  children: React.ReactNode;
  height?: string;
  aspectRatio?: string;
  className?: string;
};

// enlarges the panel within the page as a big centered overlay, does
// not call the fullscreen api, this stays inside the browser window
// pass either a fixed height or an aspect ratio like "16 / 9"
export const ExpandablePanel = ({
  children,
  height,
  aspectRatio,
  className = "",
}: ExpandablePanelProps) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const normalStyle = aspectRatio
    ? { aspectRatio, width: "100%" }
    : { height };

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-console-bg/90 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        className={`panel relative overflow-hidden ${
          expanded ? "fixed inset-6 md:inset-16 z-50" : ""
        } ${className}`}
        style={expanded ? undefined : normalStyle}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded bg-console-bg/80 border border-console-border/25 hover:border-console-accent text-console-muted hover:text-console-text transition-colors"
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <div className="w-full h-full">{children}</div>
      </div>
    </>
  );
};
