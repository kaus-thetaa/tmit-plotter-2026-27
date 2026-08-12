"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { Header } from "@/components/Header";
import { AchievementShowcase } from "@/components/AchievementShowcase";
import { SerialMonitor, type LogLine } from "@/components/SerialMonitor";
import { TerrainMap } from "@/components/TerrainMap";
import { MultiAxisChart } from "@/components/MultiAxisChart";
import { ExpandablePanel } from "@/components/ExpandablePanel";
import { AltitudeGauge } from "@/components/AltitudeGauge";
import { Sparkline } from "@/components/Sparkline";
import { EmberParticles } from "@/components/EmberParticles";
import { AmbientGrain } from "@/components/AmbientGrain";
import { GForceMeter } from "@/components/GForceMeter";
import { CompassRose } from "@/components/CompassRose";
import { SignalQuality } from "@/components/SignalQuality";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import {
  useComplementaryFilter,
  accelOnlyOrientation,
  type Vector3,
  type Quaternion,
} from "@/lib/imu/useOrientation";
import { useSettings } from "@/lib/settings/useSettings";
import {
  targetAngles,
  driftPosition,
  PHASE_META,
  CYCLE,
  type FlightPhase,
} from "@/lib/simulate/flightProfile";

// video and 3d canvases touch the dom in ways that don't match between
// server and client render, ssr false avoids the hydration mismatch
const RocketModel = dynamic(() => import("@/components/RocketModel"), {
  ssr: false,
});
const VideoCarousel = dynamic(
  () => import("@/components/VideoCarousel").then((m) => m.VideoCarousel),
  { ssr: false }
);

const LOG_LIMIT = 200;
const BUFFER_SIZE = 150;
const TRAIL_LIMIT = 400;
const IDLE_TIMEOUT_MS = 45000;
const SHAKE_THRESHOLD_G = 2.2;
const SHAKE_COOLDOWN_MS = 1200;
const MOVEMENT_THRESHOLD_DEG_S = 8;

// tone per phase transition, distinct enough to tell apart by ear
const PHASE_TONES: Record<FlightPhase, number> = {
  standby: 300,
  boost: 600,
  coast: 500,
  apogee: 900,
  main: 700,
  recovery: 400,
};

type Vec = Vector3;

type Readouts = {
  accel: Vec;
  gyro: Vec;
  mag: Vec;
  lat: number | null;
  lon: number | null;
};

type SimFlightState = {
  altitudeFt: number;
  phase: FlightPhase;
};

type Trend = "up" | "down" | "flat";

const ZERO_VECTOR: Vec = { x: 0, y: 0, z: 0 };
const magnitude = (v: Vec) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

const emptyBuffers = () => ({
  t: [] as number[],
  ax: [] as number[],
  ay: [] as number[],
  az: [] as number[],
  gx: [] as number[],
  gy: [] as number[],
  gz: [] as number[],
  mx: [] as number[],
  my: [] as number[],
  mz: [] as number[],
});

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === "up") return <ChevronUp size={13} className="text-console-safe" />;
  if (trend === "down") return <ChevronDown size={13} className="text-console-critical" />;
  return <Minus size={13} className="text-console-muted" />;
};

const SPARK_WINDOW = 30;

// magnitude series over the last few samples, feeds the sparklines
const magnitudeSeries = (xs: number[], ys: number[], zs: number[]) => {
  const start = Math.max(0, xs.length - SPARK_WINDOW);
  const out: number[] = [];
  for (let i = start; i < xs.length; i++) {
    out.push(Math.sqrt(xs[i] * xs[i] + ys[i] * ys[i] + zs[i] * zs[i]));
  }
  return out;
};

export default function DisplayPage() {
  const { idleAttractEnabled, audioEnabled } = useSettings();

  const [readouts, setReadouts] = useState<Readouts>({
    accel: ZERO_VECTOR,
    gyro: ZERO_VECTOR,
    mag: ZERO_VECTOR,
    lat: null,
    lon: null,
  });
  const [trends, setTrends] = useState<{ accel: Trend; gyro: Trend; mag: Trend }>({
    accel: "flat",
    gyro: "flat",
    mag: "flat",
  });
  const [simFlight, setSimFlight] = useState<SimFlightState | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const buffersRef = useRef(emptyBuffers());
  const trailRef = useRef<[number, number][]>([]);
  const lastCycleTRef = useRef(0);
  const prevMagRef = useRef({ accel: 0, gyro: 0, mag: 0 });
  const prevPhaseRef = useRef<FlightPhase | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pulseIdRef = useRef(0);
  const [pulse, setPulse] = useState<{ id: number; color: string } | null>(null);

  const [rawOrientation, setRawOrientation] = useState<Quaternion | null>(null);
  const gyroBiasRef = useRef<Vec>({ x: 0, y: 0, z: 0 });
  const packetTimestampsRef = useRef<number[]>([]);
  const lastPacketAtRef = useRef<number | null>(null);
  const shakeCooldownRef = useRef(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const { orientation, update, reset } = useComplementaryFilter();
  const lastLineTimeRef = useRef<number | null>(null);

  const appendLog = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString();
    setLog((prev) => {
      const next = [...prev, { time, text }];
      return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next;
    });
  }, []);

  const pushChartSample = useCallback(
    (t: number, accel: Vec, gyro: Vec, mag: Vec) => {
      const buf = buffersRef.current;
      buf.t.push(t);
      buf.ax.push(accel.x);
      buf.ay.push(accel.y);
      buf.az.push(accel.z);
      buf.gx.push(gyro.x);
      buf.gy.push(gyro.y);
      buf.gz.push(gyro.z);
      buf.mx.push(mag.x);
      buf.my.push(mag.y);
      buf.mz.push(mag.z);

      if (buf.t.length > BUFFER_SIZE) {
        (Object.keys(buf) as (keyof typeof buf)[]).forEach((key) => buf[key].shift());
      }
    },
    []
  );

  const pushTrail = useCallback((lat: number, lon: number) => {
    trailRef.current.push([lon, lat]);
    if (trailRef.current.length > TRAIL_LIMIT) trailRef.current.shift();
  }, []);

  const updateTrends = useCallback((accel: Vec, gyro: Vec, mag: Vec) => {
    const next = { accel: magnitude(accel), gyro: magnitude(gyro), mag: magnitude(mag) };
    const prev = prevMagRef.current;
    const trendOf = (n: number, p: number): Trend =>
      n > p * 1.02 ? "up" : n < p * 0.98 ? "down" : "flat";
    setTrends({
      accel: trendOf(next.accel, prev.accel),
      gyro: trendOf(next.gyro, prev.gyro),
      mag: trendOf(next.mag, prev.mag),
    });
    prevMagRef.current = next;
  }, []);

  const playTone = useCallback(
    (freq: number) => {
      if (!audioEnabled) return;
      try {
        const ctx =
          audioCtxRef.current ??
          new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {
        // audio context blocked or unavailable, fine to skip silently
      }
    },
    [audioEnabled]
  );

  const handleLine = useCallback(
    (line: string) => {
      appendLog(line);
      // accepts 9 values (imu only) or 11 (imu plus gps)
      const parts = line.split(",").map(Number);
      if (parts.length < 9 || parts.some(Number.isNaN)) return;
      const [ax, ay, az, gx, gy, gz, mx, my, mz] = parts;
      const lat = parts.length >= 11 ? parts[9] : null;
      const lon = parts.length >= 11 ? parts[10] : null;
      const bias = gyroBiasRef.current;
      const accel = { x: ax, y: ay, z: az };
      const gyro = { x: gx - bias.x, y: gy - bias.y, z: gz - bias.z };
      const mag = { x: mx, y: my, z: mz };

      const now = performance.now();
      const dt = lastLineTimeRef.current
        ? (now - lastLineTimeRef.current) / 1000
        : 0.05;
      lastLineTimeRef.current = now;

      packetTimestampsRef.current.push(now);
      if (packetTimestampsRef.current.length > 60) packetTimestampsRef.current.shift();
      lastPacketAtRef.current = now;

      update(accel, gyro, dt);
      setRawOrientation(accelOnlyOrientation(accel));
      setReadouts({ accel, gyro, mag, lat, lon });
      updateTrends(accel, gyro, mag);
      if (lat !== null && lon !== null) pushTrail(lat, lon);
      pushChartSample(
        buffersRef.current.t.length
          ? buffersRef.current.t[buffersRef.current.t.length - 1] + dt
          : 0,
        accel,
        gyro,
        mag
      );

      const accelMag = magnitude(accel);
      const gyroMag = magnitude(gyro);

      if (!hasMoved && gyroMag > MOVEMENT_THRESHOLD_DEG_S) setHasMoved(true);

      if (accelMag > SHAKE_THRESHOLD_G && now - shakeCooldownRef.current > SHAKE_COOLDOWN_MS) {
        shakeCooldownRef.current = now;
        if (!hasMoved) setHasMoved(true);
        pulseIdRef.current += 1;
        setPulse({ id: pulseIdRef.current, color: "#F4F4F4" });
      }
    },
    [appendLog, update, pushChartSample, pushTrail, updateTrends, hasMoved]
  );

  const handleCalibrate = useCallback(() => {
    const bias = gyroBiasRef.current;
    gyroBiasRef.current = {
      x: readouts.gyro.x + bias.x,
      y: readouts.gyro.y + bias.y,
      z: readouts.gyro.z + bias.z,
    };
  }, [readouts.gyro]);

  const { isConnected, isSupported, connect, disconnect } =
    useSerialPort(handleLine);

  const G = 9.8;
  const DT = 0.1;

  const generateFake = useCallback((elapsed: number) => {
    const now = targetAngles(elapsed);
    const prev = targetAngles(Math.max(0, elapsed - DT));

    const gyro: Vec = {
      x: (now.roll - prev.roll) / DT,
      y: (now.pitch - prev.pitch) / DT,
      z: (((now.yaw - prev.yaw + 540) % 360) - 180) / DT,
    };

    const rollRad = (now.roll * Math.PI) / 180;
    const pitchRad = (now.pitch * Math.PI) / 180;

    const accel: Vec = {
      x: -Math.sin(pitchRad) * G,
      y: Math.sin(rollRad) * Math.cos(pitchRad) * G,
      z: Math.cos(rollRad) * Math.cos(pitchRad) * G,
    };

    const yawRad = (now.yaw * Math.PI) / 180;
    const mag: Vec = {
      x: 30 * Math.cos(yawRad),
      y: 30 * Math.sin(yawRad),
      z: -12,
    };

    const { lat, lon } = driftPosition(elapsed);
    const cycleT = elapsed % CYCLE;

    return {
      accel,
      gyro,
      mag,
      lat,
      lon,
      altitudeFt: now.altitudeFt,
      phase: now.phase,
      cycleT,
    };
  }, []);

  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      update(d.accel, d.gyro, DT);
      setReadouts({ accel: d.accel, gyro: d.gyro, mag: d.mag, lat: d.lat, lon: d.lon });
      updateTrends(d.accel, d.gyro, d.mag);
      setSimFlight({ altitudeFt: d.altitudeFt, phase: d.phase });

      if (d.phase !== prevPhaseRef.current) {
        playTone(PHASE_TONES[d.phase]);
        pulseIdRef.current += 1;
        setPulse({ id: pulseIdRef.current, color: PHASE_META[d.phase].color });
        prevPhaseRef.current = d.phase;
      }

      if (d.cycleT < lastCycleTRef.current) trailRef.current = [];
      lastCycleTRef.current = d.cycleT;
      pushTrail(d.lat, d.lon);

      pushChartSample(
        buffersRef.current.t.length
          ? buffersRef.current.t[buffersRef.current.t.length - 1] + DT
          : 0,
        d.accel,
        d.gyro,
        d.mag
      );
      appendLog(
        `[sim] ${d.accel.x.toFixed(2)},${d.accel.y.toFixed(2)},${d.accel.z.toFixed(2)},${d.gyro.x.toFixed(1)},${d.gyro.y.toFixed(1)},${d.gyro.z.toFixed(1)},${d.mag.x.toFixed(1)},${d.mag.y.toFixed(1)},${d.mag.z.toFixed(1)},${d.lat.toFixed(5)},${d.lon.toFixed(5)}`
      );
    },
    DT * 1000
  );

  const handleToggleSimulate = useCallback(() => {
    if (isSimulating) {
      stop();
      reset();
      buffersRef.current = emptyBuffers();
      trailRef.current = [];
      prevPhaseRef.current = null;
      setSimFlight(null);
      setReadouts({ accel: ZERO_VECTOR, gyro: ZERO_VECTOR, mag: ZERO_VECTOR, lat: null, lon: null });
    } else {
      buffersRef.current = emptyBuffers();
      trailRef.current = [];
      lastCycleTRef.current = 0;
      start();
    }
  }, [isSimulating, stop, reset, start]);

  const handleConnect = () => {
    if (!isSupported) {
      alert("web serial needs chrome or edge on desktop");
      return;
    }
    lastLineTimeRef.current = null;
    buffersRef.current = emptyBuffers();
    trailRef.current = [];
    setSimFlight(null);
    gyroBiasRef.current = { x: 0, y: 0, z: 0 };
    packetTimestampsRef.current = [];
    lastPacketAtRef.current = null;
    setHasMoved(false);
    setRawOrientation(null);
    connect({ baudRate: 115200 });
  };

  // recomputes signal quality on a steady tick since packets could
  // stop arriving entirely, which wouldn't otherwise trigger a render
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [isConnected]);

  // idle attract: if nothing has happened for a while and nothing is
  // running, start the sim on its own so the booth stays lively
  useEffect(() => {
    if (!idleAttractEnabled) return;
    let idleTimer: ReturnType<typeof setTimeout>;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isSimulating && !isConnected) handleToggleSimulate();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "touchstart", "keydown", "wheel"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [idleAttractEnabled, isSimulating, isConnected, handleToggleSimulate]);

  const fmt = (v: number, digits = 2) => v.toFixed(digits);
  const buf = buffersRef.current;
  const showSimState = isSimulating && !isConnected && simFlight;

  const nowForStats = performance.now();
  const packetHz = packetTimestampsRef.current.filter((t) => nowForStats - t < 1000).length;
  const msSinceLastPacket = lastPacketAtRef.current
    ? nowForStats - lastPacketAtRef.current
    : null;
  const magHeading = ((Math.atan2(readouts.mag.y, readouts.mag.x) * 180) / Math.PI + 360) % 360;
  void nowTick; // referenced so the periodic tick actually triggers this recompute

  return (
    <div className="min-h-screen flex flex-col relative">
      <AmbientGrain />
      <EmberParticles
        active={Boolean(showSimState) && (simFlight?.phase === "boost" || simFlight?.phase === "coast")}
      />
      {pulse && (
        <div
          key={pulse.id}
          className="fixed inset-0 pointer-events-none z-30"
          style={{ backgroundColor: pulse.color, animation: "phase-pulse 0.7s ease-out forwards" }}
          onAnimationEnd={() => setPulse(null)}
        />
      )}

      <Header
        title="Display"
        isConnected={isConnected}
        isSimulating={isSimulating}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onToggleSimulate={handleToggleSimulate}
      />

      {/* drop your logo at public/logo.png, hidden automatically if missing */}
      <img
        src="/logo.png"
        alt="thrustMIT"
        className="absolute top-4 right-6 h-8 z-10"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 p-3">
        <div className="lg:col-span-2 flex flex-col gap-2">
          {showSimState && (
            <div className="panel px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PHASE_META[simFlight.phase].color }}
                />
                <span
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: PHASE_META[simFlight.phase].color }}
                >
                  {PHASE_META[simFlight.phase].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-console-text">
                  {Math.round(simFlight.altitudeFt).toLocaleString()} ft
                </span>
                <AltitudeGauge altitudeFt={simFlight.altitudeFt} />
              </div>
            </div>
          )}

          {isConnected && (
            <div className="panel px-4 py-2 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <GForceMeter magnitude={magnitude(readouts.accel)} />
                <CompassRose headingDeg={magHeading} />
                <SignalQuality hz={packetHz} msSinceLastPacket={msSinceLastPacket} />
              </div>
              <button
                onClick={handleCalibrate}
                className="panel px-3 py-1.5 text-xs hover:border-console-accent transition-colors"
              >
                calibrate gyro
              </button>
            </div>
          )}

          {isConnected && !hasMoved && (
            <div className="panel px-4 py-2 text-center">
              <p className="text-console-muted text-xs">
                pick up the board to see the rocket react live
              </p>
            </div>
          )}

          <ExpandablePanel height="340px">
            <RocketModel
              orientation={orientation}
              phase={showSimState ? simFlight.phase : null}
              rawOrientation={isConnected ? rawOrientation : null}
            />
          </ExpandablePanel>

          <AchievementShowcase />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ExpandablePanel height="180px">
              <MultiAxisChart
                title="Accel"
                unit="g"
                t={buf.t}
                series={[
                  { label: "x", color: "#FC3D21", data: buf.ax },
                  { label: "y", color: "#1D7373", data: buf.ay },
                  { label: "z", color: "#005288", data: buf.az },
                ]}
              />
            </ExpandablePanel>
            <ExpandablePanel height="180px">
              <MultiAxisChart
                title="Gyro"
                unit="deg/s"
                t={buf.t}
                series={[
                  { label: "x", color: "#FC3D21", data: buf.gx },
                  { label: "y", color: "#1D7373", data: buf.gy },
                  { label: "z", color: "#005288", data: buf.gz },
                ]}
              />
            </ExpandablePanel>
            <ExpandablePanel height="180px">
              <MultiAxisChart
                title="Mag"
                unit="uT"
                t={buf.t}
                series={[
                  { label: "x", color: "#FC3D21", data: buf.mx },
                  { label: "y", color: "#1D7373", data: buf.my },
                  { label: "z", color: "#005288", data: buf.mz },
                ]}
              />
            </ExpandablePanel>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="panel p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-console-muted text-xs" style={{ color: "#FC3D21" }}>
                accel (g)
              </span>
              <div className="flex items-center gap-2">
                <Sparkline data={magnitudeSeries(buf.ax, buf.ay, buf.az)} color="#FC3D21" />
                <TrendIcon trend={trends.accel} />
              </div>
            </div>
            <p className="font-mono text-sm">
              x {fmt(readouts.accel.x)} y {fmt(readouts.accel.y)} z {fmt(readouts.accel.z)}
            </p>

            <div className="flex items-center justify-between pt-1.5 border-t border-console-border/15">
              <span className="text-console-muted text-xs" style={{ color: "#1D7373" }}>
                gyro (deg/s)
              </span>
              <div className="flex items-center gap-2">
                <Sparkline data={magnitudeSeries(buf.gx, buf.gy, buf.gz)} color="#1D7373" />
                <TrendIcon trend={trends.gyro} />
              </div>
            </div>
            <p className="font-mono text-sm">
              x {fmt(readouts.gyro.x, 1)} y {fmt(readouts.gyro.y, 1)} z {fmt(readouts.gyro.z, 1)}
            </p>

            <div className="flex items-center justify-between pt-1.5 border-t border-console-border/15">
              <span className="text-console-muted text-xs" style={{ color: "#A2673F" }}>
                magnetometer (uT)
              </span>
              <div className="flex items-center gap-2">
                <Sparkline data={magnitudeSeries(buf.mx, buf.my, buf.mz)} color="#A2673F" />
                <TrendIcon trend={trends.mag} />
              </div>
            </div>
            <p className="font-mono text-sm">
              x {fmt(readouts.mag.x, 1)} y {fmt(readouts.mag.y, 1)} z {fmt(readouts.mag.z, 1)}
            </p>
          </div>

          <div className="panel p-3 border-l-2 border-l-[#005288]">
            <p className="text-console-muted text-xs mb-1">gps position</p>
            <p className="text-sm font-mono">
              {readouts.lat === null ? "--" : readouts.lat.toFixed(5)},{" "}
              {readouts.lon === null ? "--" : readouts.lon.toFixed(5)}
            </p>
          </div>

          <ExpandablePanel aspectRatio="16 / 9">
            <VideoCarousel />
          </ExpandablePanel>

          <ExpandablePanel height="220px">
            <TerrainMap
              lat={readouts.lat}
              lon={readouts.lon}
              trail={trailRef.current}
              altitudeFt={showSimState ? simFlight.altitudeFt : null}
            />
          </ExpandablePanel>

          <ExpandablePanel height="170px">
            <SerialMonitor lines={log} onClear={() => setLog([])} />
          </ExpandablePanel>

          <p className="text-console-muted text-xs px-1">
            imu (accel, gyro, magnetometer) and optionally gps over serial,
            or hit simulate for a full standby to recovery flight
          </p>
        </div>
      </main>
    </div>
  );
}
