"use client";

type SignalQualityProps = {
  hz: number;
  msSinceLastPacket: number | null;
};

// live packet rate and freshness, goes red and stops pulsing the
// instant the real feed goes stale instead of just silently freezing
export const SignalQuality = ({ hz, msSinceLastPacket }: SignalQualityProps) => {
  const stale = msSinceLastPacket === null || msSinceLastPacket > 1000;

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${stale ? "bg-console-critical" : "bg-console-safe animate-pulse"}`} />
      <span className="text-console-muted text-xs font-mono">
        {stale ? "stale" : `${hz} hz`}
      </span>
    </div>
  );
};
