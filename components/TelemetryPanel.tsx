"use client";

import { X } from "lucide-react";
import { ExpandablePanel } from "./ExpandablePanel";

type TelemetryPanelProps = {
  label: string;
  color: string;
  height?: string;
  onClose: () => void;
  children: React.ReactNode;
};

// the modular building block: every group panel gets a label, a close
// button (top left, so it never collides with the expand button
// expandable panel already puts top right), and can be reopened later
// from the manage panels row. height defaults to fill its flex parent
// so sidebar panels can share available space with no page scroll
export const TelemetryPanel = ({ label, color, height = "100%", onClose, children }: TelemetryPanelProps) => (
  <ExpandablePanel height={height}>
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-console-muted text-xs">{label}</span>
        </div>
        <button
          onClick={onClose}
          className="text-console-muted hover:text-console-critical transition-colors p-0.5"
          aria-label={`close ${label}`}
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  </ExpandablePanel>
);
