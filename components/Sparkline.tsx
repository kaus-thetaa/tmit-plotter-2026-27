"use client";

type SparklineProps = {
  data: number[];
  color: string;
};

// tiny inline trend chart, sits beside each sensor row instead of
// just an up or down arrow
export const Sparkline = ({ data, color }: SparklineProps) => {
  if (data.length < 2) return <svg width="56" height="18" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 56;
      const y = 17 - ((v - min) / range) * 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width="56" height="18">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};
