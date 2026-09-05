// telemetry field groups, ported from the inspiration repo's much
// richer data model (accel, gyro, mag, env, gps, link, continuity,
// battery) instead of just altitude, velocity and acceleration

export type TelemetryGroupId =
  | "flight"
  | "accel"
  | "gyro"
  | "mag"
  | "env"
  | "gps"
  | "link"
  | "continuity"
  | "battery";

export type TelemetryGroup = {
  id: TelemetryGroupId;
  label: string;
  color: string;
};

export const TELEMETRY_GROUPS: TelemetryGroup[] = [
  { id: "flight", label: "Flight", color: "#005288" },
  { id: "accel", label: "Accelerometer", color: "#FC3D21" },
  { id: "gyro", label: "Gyroscope", color: "#1D7373" },
  { id: "mag", label: "Magnetometer", color: "#A2673F" },
  { id: "env", label: "Environment", color: "#D1480F" },
  { id: "gps", label: "GPS", color: "#005288" },
  { id: "link", label: "Radio Link", color: "#98A6A9" },
  { id: "continuity", label: "Pyro Continuity", color: "#FC3D21" },
  { id: "battery", label: "Battery", color: "#1D7373" },
];

export const GROUP_BY_ID: Record<TelemetryGroupId, TelemetryGroup> = TELEMETRY_GROUPS.reduce(
  (acc, g) => ({ ...acc, [g.id]: g }),
  {} as Record<TelemetryGroupId, TelemetryGroup>
);
