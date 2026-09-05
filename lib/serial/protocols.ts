// shared across every mode's serial connection: what format is the
// incoming line in, and what does each mode's payload look like

export type SerialPreset = "direct" | "lora-rx" | "lora-tx";

export type UnwrappedLine = {
  payload: string;
  rssi?: number;
  snr?: number;
  addr?: string;
};

// unwraps a rylr998 +RCV response into its inner csv payload plus
// link stats, direct mode passes the raw line straight through,
// lora-tx is an outgoing only preset so nothing to unwrap on receive
export const unwrapLine = (line: string, preset: SerialPreset): UnwrappedLine | null => {
  if (preset === "direct") return { payload: line };

  if (preset === "lora-rx") {
    const match = line.match(/^\+RCV=(\d+),(\d+),(.+)$/);
    if (!match) return null;
    const [, addr, , rest] = match;
    const parts = rest.split(",");
    if (parts.length < 3) return null;
    const snr = Number(parts[parts.length - 1]);
    const rssi = Number(parts[parts.length - 2]);
    if (Number.isNaN(snr) || Number.isNaN(rssi)) return null;
    const payload = parts.slice(0, parts.length - 2).join(",");
    return { payload, rssi, snr, addr };
  }

  return null;
};

export type ModeId = "display" | "telemetry" | "motor";

export const MODE_FORMATS: Record<ModeId, { columns: string; example: string }> = {
  display: {
    columns: "ax,ay,az,gx,gy,gz,mx,my,mz,lat,lon",
    example: "0.01,-0.02,0.98,1.2,-0.5,0.1,32.1,-8.4,-12.0,13.34650,74.79350",
  },
  telemetry: {
    columns:
      "altitude,velocity,accel_z,accel_x,accel_y,gyro_x,gyro_y,gyro_z,mag_x,mag_y,mag_z,pressure,temp,gps_alt,sats,fix,rssi,snr,battery,drogue_cont,main_cont,lat,lon",
    example:
      "1200.5,45.2,-9.8,0.1,-0.2,1.1,0.5,-0.3,32.1,-8.4,-12.0,875.2,18.5,1198.0,10,3,-78,9,7.9,1,1,13.34650,74.79350",
  },
  motor: {
    columns: "pressure,thrust,temp",
    example: "820.5,1450.2,24.1",
  },
};

export const AT_QUICK_COMMANDS: { label: string; cmd: string }[] = [
  { label: "AT", cmd: "AT" },
  { label: "ADDRESS?", cmd: "AT+ADDRESS?" },
  { label: "NETWORKID?", cmd: "AT+NETWORKID?" },
  { label: "BAND?", cmd: "AT+BAND?" },
  { label: "PARAMETER?", cmd: "AT+PARAMETER?" },
];
