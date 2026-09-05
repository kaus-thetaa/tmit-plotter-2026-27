"use client";

import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export type AxisSeries = {
  label: string;
  color: string;
  data: number[];
};

type MultiAxisChartProps = {
  title: string;
  unit: string;
  t: number[];
  series: AxisSeries[];
};

// one uplot chart with three overlaid lines, used for accel gyro and
// magnetometer so each sensor reads as one clean panel, not nine
export const MultiAxisChart = ({ title, unit, t, series }: MultiAxisChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 160,
      title: `${title} (${unit})`,
      scales: { x: { time: false } },
      series: [
        {},
        ...series.map((s) => ({
          label: s.label,
          stroke: s.color,
          width: 2,
          points: { show: false },
        })),
      ],
      axes: [
        { stroke: "#B6B6B6", grid: { stroke: "rgba(182,182,182,0.15)" } },
        { stroke: "#B6B6B6", grid: { stroke: "rgba(182,182,182,0.15)" } },
      ],
      legend: { show: true },
    };

    plotRef.current = new uPlot(
      options,
      [t, ...series.map((s) => s.data)],
      containerRef.current
    );

    const resize = () => {
      if (containerRef.current && plotRef.current) {
        plotRef.current.setSize({
          width: containerRef.current.clientWidth,
          height: 160,
        });
      }
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      plotRef.current?.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, unit]);

  useEffect(() => {
    plotRef.current?.setData([t, ...series.map((s) => s.data)]);
  }, [t, series]);

  return <div ref={containerRef} className="w-full h-full p-2" />;
};
