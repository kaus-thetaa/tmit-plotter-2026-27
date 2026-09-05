// realistic sounding rocket profile for telemetry's simulated feed,
// 30,000 ft apogee, straight line wind drift instead of the old
// sin/cos pair which traced a closed circle and read as an orbit

export const BOOST_END = 5;
export const APOGEE_T = 60;
export const DROGUE_END = 150;
export const MAIN_END = 210;
export const CYCLE = 215;

export const APOGEE_M = 9144; // 30,000 ft
const MAIN_DEPLOY_M = 457; // 1,500 ft

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;

export const altitudeAt = (tInCycle: number): number => {
  const t = tInCycle;
  if (t < APOGEE_T) {
    return APOGEE_M * easeOutCubic(t / APOGEE_T);
  }
  if (t < DROGUE_END) {
    const p = (t - APOGEE_T) / (DROGUE_END - APOGEE_T);
    return APOGEE_M - (APOGEE_M - MAIN_DEPLOY_M) * easeInCubic(p);
  }
  if (t < MAIN_END) {
    const p = (t - DROGUE_END) / (MAIN_END - DROGUE_END);
    return MAIN_DEPLOY_M * (1 - easeOutCubic(p));
  }
  return 0;
};

// straight line wind drift downrange, not the old circular sin/cos
// pair, drift accelerates once under canopy the way a real recovery
// does since more time is spent slow and exposed to wind
const WIND_BEARING_RAD = (35 * Math.PI) / 180; // fixed downrange direction
const M_PER_DEG_LAT = 111320;

export const groundDriftAt = (tInCycle: number, baseLat: number, baseLon: number) => {
  const t = tInCycle;
  let driftM: number;

  if (t < APOGEE_T) {
    driftM = 40 * (t / APOGEE_T); // modest drift under thrust and coast
  } else if (t < DROGUE_END) {
    const p = (t - APOGEE_T) / (DROGUE_END - APOGEE_T);
    driftM = 40 + 900 * p; // faster drift under drogue, more time exposed
  } else {
    const p = Math.min(1, (t - DROGUE_END) / (MAIN_END - DROGUE_END));
    driftM = 940 + 260 * p; // continues but slower under main
  }

  const mPerDegLon = M_PER_DEG_LAT * Math.cos((baseLat * Math.PI) / 180);
  return {
    lat: baseLat + (driftM * Math.cos(WIND_BEARING_RAD)) / M_PER_DEG_LAT,
    lon: baseLon + (driftM * Math.sin(WIND_BEARING_RAD)) / mPerDegLon,
  };
};

// numeric derivative, reused for velocity so it stays consistent with
// whatever the altitude curve actually does instead of a separate
// hand tuned formula that could drift out of sync
export const velocityAt = (tInCycle: number, dt = 0.05): number => {
  const t = tInCycle;
  const now = altitudeAt(t);
  const prev = altitudeAt(Math.max(0, t - dt));
  return (now - prev) / dt;
};

// simple phase constant accel with brief opening shocks at drogue and
// main deploy, not trying to model the full transient in detail
export const accelZAt = (tInCycle: number): number => {
  const t = tInCycle;
  if (t < BOOST_END) return 110;
  if (t < APOGEE_T) return -9.8;
  if (t < APOGEE_T + 2) return -25;
  if (t < DROGUE_END) return -9.8;
  if (t < DROGUE_END + 1) return -20;
  if (t < MAIN_END) return -3;
  return 0;
};
