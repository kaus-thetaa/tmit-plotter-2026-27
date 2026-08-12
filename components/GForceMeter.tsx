"use client";

type GForceMeterProps = {
  magnitude: number;
  maxG?: number;
};

// circular gauge for live accel magnitude, resting is around 1g so
// the ring visibly reacts the instant the board is picked up or tapped
export const GForceMeter = ({ magnitude, maxG = 3 }: GForceMeterProps) => {
  const pct = Math.min(1, magnitude / maxG);
  const r = 24;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const color = magnitude > 2.2 ? "#FC3D21" : "#005288";

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#B6B6B6" strokeOpacity="0.2" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.2s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono text-console-text">{magnitude.toFixed(1)}g</span>
      </div>
    </div>
  );
};
