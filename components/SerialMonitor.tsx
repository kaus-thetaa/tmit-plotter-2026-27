"use client";

import { useEffect, useRef } from "react";

export type LogLine = {
  time: string;
  text: string;
};

type SerialMonitorProps = {
  lines: LogLine[];
  onClear: () => void;
};

// raw line viewer for debugging a live serial link, shares the connection
// already opened by the page header, this just displays what comes in
export const SerialMonitor = ({ lines, onClear }: SerialMonitorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="panel p-4 flex flex-col h-[220px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-console-muted text-xs tracking-[0.15em] uppercase">
          serial monitor
        </p>
        <button
          onClick={onClear}
          className="text-console-muted text-xs hover:text-console-text transition-colors"
        >
          clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin font-mono text-xs space-y-0.5"
      >
        {lines.length === 0 ? (
          <p className="text-console-muted">no data yet, connect a device</p>
        ) : (
          lines.map((line, i) => (
            <p key={i} className="text-console-text/80">
              <span className="text-console-muted">{line.time}</span>{" "}
              {line.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
};
