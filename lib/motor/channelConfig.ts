export type ChannelId = "pressure" | "thrust" | "temp";

export type ChannelConfig = {
  id: ChannelId;
  label: string;
  unit: string;
  rangeMin: number;
  rangeMax: number;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  color: string;
  priority: number;
  autoscale: boolean;
};

export const MOTOR_CHANNELS: ChannelConfig[] = [
  {
    id: "pressure",
    label: "Chamber Pressure",
    unit: "psi",
    rangeMin: 0,
    rangeMax: 1500,
    warningThreshold: 1200,
    criticalThreshold: 1400,
    color: "#e8a040",
    priority: 1,
    autoscale: false,
  },
  {
    id: "thrust",
    label: "Thrust",
    unit: "N",
    rangeMin: 0,
    rangeMax: 3000,
    warningThreshold: null,
    criticalThreshold: null,
    color: "#4fc3f7",
    priority: 2,
    autoscale: false,
  },
  {
    id: "temp",
    label: "Casing Temp",
    unit: "C",
    rangeMin: 0,
    rangeMax: 400,
    warningThreshold: 300,
    criticalThreshold: 370,
    color: "#ef5350",
    priority: 3,
    autoscale: true,
  },
];

export type ChannelStatus = "nominal" | "warning" | "critical";

export const getChannelStatus = (
  channel: ChannelConfig,
  value: number
): ChannelStatus => {
  if (channel.criticalThreshold !== null && value >= channel.criticalThreshold) {
    return "critical";
  }
  if (channel.warningThreshold !== null && value >= channel.warningThreshold) {
    return "warning";
  }
  return "nominal";
};
