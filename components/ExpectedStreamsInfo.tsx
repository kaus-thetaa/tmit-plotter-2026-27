"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

type ExpectedStreamsInfoProps = {
  directFormat: string;
  loraRxFormat: string;
  loraTxFormat: string;
};

// small reference card, what this mode expects to see on the wire in
// each connection preset, opens from a single info icon
export const ExpectedStreamsInfo = ({
  directFormat,
  loraRxFormat,
  loraTxFormat,
}: ExpectedStreamsInfoProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-console-muted hover:text-console-text transition-colors"
        aria-label="expected serial streams"
      >
        <Info size={15} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-console-bg/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm tracking-wide">Expected Serial Streams</p>
              <button onClick={() => setOpen(false)} className="text-console-muted hover:text-console-text">
                <X size={16} />
              </button>
            </div>
            <div className="h-px bg-console-border/15" />

            <div>
              <p className="text-xs font-semibold" style={{ color: "#005288" }}>
                STANDARD CSV
              </p>
              <code className="block mt-1.5 bg-console-bg border border-console-border/15 rounded px-3 py-2 text-xs font-mono text-console-text break-all">
                {directFormat}
              </code>
            </div>

            <div>
              <p className="text-xs font-semibold" style={{ color: "#D1480F" }}>
                RECEIVER NODE (LORA)
              </p>
              <code className="block mt-1.5 bg-console-bg border border-console-border/15 rounded px-3 py-2 text-xs font-mono text-console-text break-all">
                {loraRxFormat}
              </code>
            </div>

            <div>
              <p className="text-xs font-semibold" style={{ color: "#A2673F" }}>
                TRANSMITTER NODE (LORA)
              </p>
              <code className="block mt-1.5 bg-console-bg border border-console-border/15 rounded px-3 py-2 text-xs font-mono text-console-text break-all">
                {loraTxFormat}
              </code>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
