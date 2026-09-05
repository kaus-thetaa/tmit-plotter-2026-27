// single source of truth for the display mode demo flight, standby
// through boost coast apogee drogue main and recovery, apogee pinned
// to vayu vega's actual 29432 ft record

export type FlightPhase =
  | "standby"
  | "boost"
  | "coast"
  | "apogee"
  | "main"
  | "recovery";

export const PHASE_META: Record<FlightPhase, { label: string; color: string }> = {
  standby: { label: "standby", color: "#B6B6B6" },
  boost: { label: "boost", color: "#FC3D21" },
  coast: { label: "coast", color: "#D1480F" },
  apogee: { label: "apogee, drogue", color: "#A2673F" },
  main: { label: "main chute", color: "#1D7373" },
  recovery: { label: "recovery", color: "#005288" },
};

const STANDBY_END = 4;
const BOOST_END = 10;
const APOGEE_T = 55;
const DROGUE_END = 130;
const MAIN_END = 195;
export const CYCLE = 200;

export const APOGEE_FT = 29432;
const MAIN_DEPLOY_FT = 1500;

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;

export const altitudeFt = (tInCycle: number): number => {
  const t = tInCycle;
  if (t < STANDBY_END) return 0;
  if (t < APOGEE_T) {
    const p = (t - STANDBY_END) / (APOGEE_T - STANDBY_END);
    return APOGEE_FT * easeOutCubic(p);
  }
  if (t < DROGUE_END) {
    const p = (t - APOGEE_T) / (DROGUE_END - APOGEE_T);
    return APOGEE_FT - (APOGEE_FT - MAIN_DEPLOY_FT) * easeInCubic(p);
  }
  if (t < MAIN_END) {
    const p = (t - DROGUE_END) / (MAIN_END - DROGUE_END);
    return MAIN_DEPLOY_FT * (1 - easeOutCubic(p));
  }
  return 0;
};

export const flightPhase = (tInCycle: number, altFt: number): FlightPhase => {
  const t = tInCycle;
  if (t < STANDBY_END) return "standby";
  if (t < BOOST_END) return "boost";
  if (t < APOGEE_T) return "coast";
  if (altFt > MAIN_DEPLOY_FT) return "apogee";
  if (altFt > 0) return "main";
  return "recovery";
};

export type TargetAngles = {
  roll: number;
  pitch: number;
  yaw: number;
  phase: FlightPhase;
  altitudeFt: number;
};

// gyro and accel are derived from this target, so the resulting motion
// and the complementary filter output line up with the current phase
export const targetAngles = (elapsed: number): TargetAngles => {
  const t = elapsed % CYCLE;
  const alt = altitudeFt(t);
  const phase = flightPhase(t, alt);

  let roll: number;
  let pitch: number;

  switch (phase) {
    case "standby":
      roll = 1.5 * Math.sin(t * 1.2);
      pitch = 1 * Math.cos(t * 1.5);
      break;
    case "boost":
      roll = 3 * Math.sin(t * 2);
      pitch = 4 * Math.sin(t * 1.7);
      break;
    case "coast":
      roll = 6 * Math.sin(t * 1.5);
      pitch = 5 * Math.cos(t * 1.3);
      break;
    case "apogee":
      roll = 22 * Math.sin(t * 3);
      pitch = 18 * Math.cos(t * 2.6);
      break;
    case "main":
      roll = 12 * Math.sin(t * 2);
      pitch = 10 * Math.cos(t * 1.8);
      break;
    case "recovery":
      roll = 0;
      pitch = 0;
      break;
  }

  const spinRate = phase === "boost" || phase === "coast" ? 40 : 15;
  const yaw = (elapsed * spinRate) % 360;

  return { roll, pitch, yaw, phase, altitudeFt: alt };
};

// downrange drift once liftoff happens, resets each cycle so the
// trajectory trail can be cleared on loop instead of growing forever
export const driftPosition = (elapsed: number) => {
  const t = elapsed % CYCLE;
  const sinceLiftoff = Math.max(0, t - STANDBY_END);
  const lat = 13.3465 + sinceLiftoff * 0.00003 + 0.0001 * Math.sin(t * 0.3);
  const lon = 74.7935 + sinceLiftoff * 0.00007 + 0.0001 * Math.cos(t * 0.3);
  return { lat, lon };
};
