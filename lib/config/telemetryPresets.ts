// three major dashboard view presets, selected from a dropdown in
// telemetry's control bar
import type { TelemetryGroupId } from "./telemetryFields";

export type TelemetryPreset = {
  id: string;
  label: string;
  groups: TelemetryGroupId[];
};

export const TELEMETRY_PRESETS: TelemetryPreset[] = [
  {
    id: "flight-ops",
    label: "Flight Ops",
    groups: ["flight", "gps", "link", "continuity", "battery"],
  },
  {
    id: "engineering",
    label: "Full Engineering",
    groups: [
      "flight",
      "accel",
      "gyro",
      "mag",
      "env",
      "gps",
      "link",
      "continuity",
      "battery",
    ],
  },
  {
    id: "public",
    label: "Public Display",
    groups: ["flight", "gps"],
  },
];
