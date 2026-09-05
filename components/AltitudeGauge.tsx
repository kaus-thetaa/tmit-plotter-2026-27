"use client";

type AltitudeGaugeProps = {
  altitudeFt: number;
  maxFt?: number;
};

// small circular progress ring toward apogee, sits next to the plain
// altitude readout instead of replacing it
export const AltitudeGauge = ({ altitudeFt, maxFt = 29432 }: AltitudeGaugeProps) => {
  const pct = Math.min(1, Math.max(0, altitudeFt / maxFt));
  const r = 24;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#B6B6B6" strokeOpacity="0.2" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke="#FC3D21"
          strokeWidth="5"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-mono text-console-text">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
};
