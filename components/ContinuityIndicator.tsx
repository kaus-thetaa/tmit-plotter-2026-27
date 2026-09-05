"use client";

type ContinuityIndicatorProps = {
  label: string;
  ok: boolean;
};

// pyro channel continuity light, green means the circuit reads
// continuous, red means it is open, either not connected or fired
export const ContinuityIndicator = ({ label, ok }: ContinuityIndicatorProps) => (
  <div className="flex items-center gap-2">
    <span
      className={`h-3 w-3 rounded-full ${ok ? "bg-console-safe" : "bg-console-critical"}`}
      style={{ boxShadow: ok ? "0 0 6px #1D7373" : "0 0 6px #FC3D21" }}
    />
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-console-muted text-xs">{ok ? "continuous" : "open"}</p>
    </div>
  </div>
);
