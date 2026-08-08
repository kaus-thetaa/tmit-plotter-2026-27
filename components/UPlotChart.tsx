"use client";

import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export type UPlotChartProps = {
  label: string;
  unit: string;
  color: string;
  data: [number[], number[]];
};

export const UPlotChart = ({ label, unit, color, data }: UPlotChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 220,
      title: `${label} (${unit})`,
      scales: { x: { time: false } },
      series: [
        {},
        {
          label,
          stroke: color,
          width: 2,
          points: { show: false },
        },
      ],
      axes: [
        { stroke: "#7d8b96", grid: { stroke: "#1f2830" } },
        { stroke: "#7d8b96", grid: { stroke: "#1f2830" } },
      ],
    };

    plotRef.current = new uPlot(options, data, containerRef.current);

    const resize = () => {
      if (containerRef.current && plotRef.current) {
        plotRef.current.setSize({
          width: containerRef.current.clientWidth,
          height: 220,
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
  }, [label, unit, color]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} className="panel p-2" />;
};
