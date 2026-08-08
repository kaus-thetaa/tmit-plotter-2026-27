"use client";

import { UPlotChart } from "./UPlotChart";

export type GraphChannel = {
  id: string;
  label: string;
  unit: string;
  color: string;
  data: [number[], number[]];
};

type GraphGridProps = {
  channels: GraphChannel[];
};

export const GraphGrid = ({ channels }: GraphGridProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {channels.map((channel) => (
        <UPlotChart
          key={channel.id}
          label={channel.label}
          unit={channel.unit}
          color={channel.color}
          data={channel.data}
        />
      ))}
    </div>
  );
};
