"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { UPlotChart } from "@/components/UPlotChart";
import { MultiAxisChart } from "@/components/MultiAxisChart";
import { TerrainMap } from "@/components/TerrainMap";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { ExpandablePanel } from "@/components/ExpandablePanel";
import { ResizeHandle } from "@/components/ResizeHandle";
import { ContinuityIndicator } from "@/components/ContinuityIndicator";
import { DownloadCsvButton } from "@/components/DownloadCsvButton";
import { SerialConsole } from "@/components/SerialConsole";
import type { LogLine } from "@/components/SerialMonitor";
import type { PathPoint } from "@/components/Flight3DPath";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import { downloadCsv } from "@/lib/csv/exportCsv";
import { unwrapLine, type SerialPreset } from "@/lib/serial/protocols";
import { TELEMETRY_GROUPS, GROUP_BY_ID, type TelemetryGroupId } from "@/lib/config/telemetryFields";
import { TELEMETRY_PRESETS } from "@/lib/config/telemetryPresets";
import { FlightStateMachine, STATE_META, altitudeToPressureHpa, type DerivedFlightState } from "@/lib/telemetry/flightStateMachine";
import { altitudeAt, velocityAt, accelZAt, groundDriftAt, CYCLE } from "@/lib/telemetry/flightProfile";

const Flight3DPath = dynamic(
  () => import("@/components/Flight3DPath").then((m) => m.Flight3DPath),
  { ssr: false }
);

const BUFFER_SIZE = 300;
const TRAIL_LIMIT = 400;
const VISIBLE_GROUPS_KEY = "tmit-telemetry-visible-groups";

const LEFT_GROUPS: TelemetryGroupId[] = ["flight", "gps", "link", "continuity", "battery"];
const RIGHT_GROUPS: TelemetryGroupId[] = ["accel", "gyro", "mag", "env"];
const LEFT_PAGE_SIZE = 2;
const RIGHT_PAGE_SIZE = 2;

type Sample = {
  t: number;
  altitude: number;
  velocity: number;
  accelZ: number;
  ax: number;
  ay: number;
  gx: number;
  gy: number;
  gz: number;
  mx: number;
  my: number;
  mz: number;
  pressure: number;
  temp: number;
  gpsAlt: number;
  sats: number;
  fix: number;
  rssi: number;
  snr: number;
  battery: number;
  drogueCont: number;
  mainCont: number;
  lat: number;
  lon: number;
};

const emptyBuffers = () => ({
  t: [] as number[],
  altitude: [] as number[],
  velocity: [] as number[],
  accelZ: [] as number[],
  ax: [] as number[],
  ay: [] as number[],
  gx: [] as number[],
  gy: [] as number[],
  gz: [] as number[],
  mx: [] as number[],
  my: [] as number[],
  mz: [] as number[],
  pressure: [] as number[],
  temp: [] as number[],
});

const loadVisibleGroups = (): Set<TelemetryGroupId> => {
  if (typeof window === "undefined") return new Set(TELEMETRY_PRESETS[0].groups);
  const stored = window.localStorage.getItem(VISIBLE_GROUPS_KEY);
  if (!stored) return new Set(TELEMETRY_PRESETS[0].groups);
  try {
    return new Set(JSON.parse(stored) as TelemetryGroupId[]);
  } catch {
    return new Set(TELEMETRY_PRESETS[0].groups);
  }
};

export default function TelemetryPage() {
  const buffersRef = useRef(emptyBuffers());
  const trailRef = useRef<[number, number][]>([]);
  const path3DRef = useRef<PathPoint[]>([]);
  const [latest, setLatest] = useState<Sample | null>(null);
  const [derivedState, setDerivedState] = useState<DerivedFlightState>("standby");
  const fsmRef = useRef(new FlightStateMachine());
  const startTimeRef = useRef<number | null>(null);

  const [visibleGroups, setVisibleGroups] = useState<Set<TelemetryGroupId>>(
    () => new Set(TELEMETRY_PRESETS[0].groups)
  );
  const [activePreset, setActivePreset] = useState<string | null>(TELEMETRY_PRESETS[0].id);
  const [log, setLog] = useState<LogLine[]>([]);
  const [serialPreset, setSerialPreset] = useState<SerialPreset>("direct");

  const appendLog = useCallback((text: string) => {
    setLog((prev) => {
      const next = [...prev, { time: new Date().toLocaleTimeString(), text }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftPage, setLeftPage] = useState(0);
  const [rightPage, setRightPage] = useState(0);
  const [leftWidth, setLeftWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(320);
  const clampWidth = useCallback((w: number) => Math.min(520, Math.max(220, w)), []);

  useEffect(() => {
    setVisibleGroups(loadVisibleGroups());
  }, []);

  const saveVisibleGroups = useCallback((next: Set<TelemetryGroupId>) => {
    setVisibleGroups(next);
    window.localStorage.setItem(VISIBLE_GROUPS_KEY, JSON.stringify(Array.from(next)));
  }, []);

  const toggleGroup = useCallback(
    (id: TelemetryGroupId) => {
      const next = new Set(visibleGroups);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setActivePreset(null);
      saveVisibleGroups(next);
    },
    [visibleGroups, saveVisibleGroups]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = TELEMETRY_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setActivePreset(presetId);
      saveVisibleGroups(new Set(preset.groups));
      setLeftPage(0);
      setRightPage(0);
    },
    [saveVisibleGroups]
  );

  const pushSample = useCallback((sample: Sample, phase: DerivedFlightState) => {
    const buf = buffersRef.current;
    buf.t.push(sample.t);
    buf.altitude.push(sample.altitude);
    buf.velocity.push(sample.velocity);
    buf.accelZ.push(sample.accelZ);
    buf.ax.push(sample.ax);
    buf.ay.push(sample.ay);
    buf.gx.push(sample.gx);
    buf.gy.push(sample.gy);
    buf.gz.push(sample.gz);
    buf.mx.push(sample.mx);
    buf.my.push(sample.my);
    buf.mz.push(sample.mz);
    buf.pressure.push(sample.pressure);
    buf.temp.push(sample.temp);

    if (buf.t.length > BUFFER_SIZE) {
      (Object.keys(buf) as (keyof typeof buf)[]).forEach((key) => buf[key].shift());
    }

    trailRef.current.push([sample.lon, sample.lat]);
    if (trailRef.current.length > TRAIL_LIMIT) trailRef.current.shift();

    path3DRef.current.push({ lat: sample.lat, lon: sample.lon, alt: sample.altitude, phase });
    if (path3DRef.current.length > TRAIL_LIMIT) path3DRef.current.shift();

    setLatest(sample);
  }, []);

  const handleLine = useCallback(
    (line: string) => {
      appendLog(line);
      const unwrapped = unwrapLine(line, serialPreset);
      if (!unwrapped) return;
      // altitude,velocity,accel_z,accel_x,accel_y,gyro_x,gyro_y,gyro_z,
      // mag_x,mag_y,mag_z,pressure,temp,gps_alt,sats,fix,rssi,snr,
      // battery,drogue_cont,main_cont,lat,lon
      const p = unwrapped.payload.split(",").map(Number);
      if (p.length < 23 || p.some(Number.isNaN)) return;
      if (startTimeRef.current === null) startTimeRef.current = performance.now();
      const t = (performance.now() - startTimeRef.current) / 1000;

      const state = fsmRef.current.update(t, p[0], p[11]);
      setDerivedState(state);

      pushSample(
        {
          t,
          altitude: p[0],
          velocity: p[1],
          accelZ: p[2],
          ax: p[3],
          ay: p[4],
          gx: p[5],
          gy: p[6],
          gz: p[7],
          mx: p[8],
          my: p[9],
          mz: p[10],
          pressure: p[11],
          temp: p[12],
          gpsAlt: p[13],
          sats: p[14],
          fix: p[15],
          rssi: unwrapped.rssi ?? p[16],
          snr: unwrapped.snr ?? p[17],
          battery: p[18],
          drogueCont: p[19],
          mainCont: p[20],
          lat: p[21],
          lon: p[22],
        },
        state
      );
    },
    [pushSample, appendLog, serialPreset]
  );

  const { isConnected, isSupported, connect, disconnect, sendCommand } = useSerialPort(handleLine);

  // realistic 30,000 ft sounding rocket profile: straight line wind
  // drift downrange, not the old circular sin and cos pair that made
  // the 3d path read as an orbit
  const generateFake = useCallback((elapsed: number) => {
    const t = elapsed % CYCLE;
    const altitude = altitudeAt(t);
    const velocity = velocityAt(t);
    const accelZ = accelZAt(t);

    const ax = 1.5 * Math.sin(elapsed * 3);
    const ay = 1.5 * Math.cos(elapsed * 2.7);
    const gx = 4 * Math.sin(elapsed * 2);
    const gy = 4 * Math.cos(elapsed * 1.8);
    const gz = 2 * Math.sin(elapsed * 1.3);
    const mx = 30 * Math.cos(elapsed * 0.4);
    const my = 30 * Math.sin(elapsed * 0.4);
    const mz = -12;

    const pressure = altitudeToPressureHpa(altitude);
    const temp = 24 - altitude * 0.0065;
    const gpsAlt = altitude + (Math.random() - 0.5) * 2;
    const sats = 9 + Math.round(2 * Math.sin(elapsed * 0.2));
    const fix = 3;
    const rssi = -75 + 10 * Math.sin(elapsed * 0.1);
    const snr = 8 + 2 * Math.cos(elapsed * 0.2);
    const battery = 8.4 - Math.min(0.8, elapsed * 0.004);

    const { lat, lon } = groundDriftAt(t, 13.3465, 74.7935);

    return { altitude, velocity, accelZ, ax, ay, gx, gy, gz, mx, my, mz, pressure, temp, gpsAlt, sats, fix, rssi, snr, battery, lat, lon };
  }, []);

  // 10hz, matching what real telemetry at this data rate looks like
  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      const t = buffersRef.current.t.length
        ? buffersRef.current.t[buffersRef.current.t.length - 1] + 0.1
        : 0;

      const state = fsmRef.current.update(t, d.altitude, d.pressure);
      setDerivedState(state);
      const drogueCont = state === "standby" || state === "boost" || state === "coast" ? 1 : 0;
      const mainCont = state === "standby" || state === "boost" || state === "coast" || state === "drogue" ? 1 : 0;

      pushSample({ ...d, t, accelZ: d.accelZ, drogueCont, mainCont }, state);
    },
    100
  );

  const handleToggleSimulate = () => {
    if (isSimulating) {
      stop();
    } else {
      buffersRef.current = emptyBuffers();
      trailRef.current = [];
      path3DRef.current = [];
      fsmRef.current.reset();
      setDerivedState("standby");
      setLatest(null);
      start();
    }
  };

  const handleConnect = () => {
    if (!isSupported) {
      alert("web serial needs chrome or edge on desktop");
      return;
    }
    startTimeRef.current = null;
    buffersRef.current = emptyBuffers();
    trailRef.current = [];
    path3DRef.current = [];
    fsmRef.current.reset();
    setDerivedState("standby");
    connect({ baudRate: 115200 });
  };

  const handleDownload = () => {
    const buf = buffersRef.current;
    downloadCsv(
      `telemetry-${Date.now()}.csv`,
      [
        "time_s", "altitude_m", "velocity_mps", "accel_z", "accel_x", "accel_y",
        "gyro_x", "gyro_y", "gyro_z", "mag_x", "mag_y", "mag_z",
        "pressure_hpa", "temp_c",
      ],
      [
        buf.t, buf.altitude, buf.velocity, buf.accelZ, buf.ax, buf.ay,
        buf.gx, buf.gy, buf.gz, buf.mx, buf.my, buf.mz,
        buf.pressure, buf.temp,
      ]
    );
  };

  const fmt = (v: number | undefined, digits = 1) => (v === undefined ? "--" : v.toFixed(digits));
  const buf = buffersRef.current;

  const visibleLeft = LEFT_GROUPS.filter((id) => visibleGroups.has(id));
  const visibleRight = RIGHT_GROUPS.filter((id) => visibleGroups.has(id));
  const leftPages = Math.max(1, Math.ceil(visibleLeft.length / LEFT_PAGE_SIZE));
  const rightPages = Math.max(1, Math.ceil(visibleRight.length / RIGHT_PAGE_SIZE));
  const leftPageClamped = Math.min(leftPage, leftPages - 1);
  const rightPageClamped = Math.min(rightPage, rightPages - 1);
  const leftShown = visibleLeft.slice(leftPageClamped * LEFT_PAGE_SIZE, (leftPageClamped + 1) * LEFT_PAGE_SIZE);
  const rightShown = visibleRight.slice(rightPageClamped * RIGHT_PAGE_SIZE, (rightPageClamped + 1) * RIGHT_PAGE_SIZE);

  const renderGroupPanel = (id: TelemetryGroupId) => {
    const group = GROUP_BY_ID[id];
    switch (id) {
      case "flight":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-2 gap-2 px-2 pb-1 text-xs">
                <p>alt {fmt(latest?.altitude)} m</p>
                <p>vel {fmt(latest?.velocity)} m/s</p>
              </div>
              <div className="flex-1 min-h-0">
                <UPlotChart label="Altitude" unit="m" color="#005288" data={[buf.t, buf.altitude]} />
              </div>
            </div>
          </TelemetryPanel>
        );
      case "accel":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <MultiAxisChart
              title="Accel"
              unit="m/s2"
              t={buf.t}
              series={[
                { label: "x", color: "#FC3D21", data: buf.ax },
                { label: "y", color: "#1D7373", data: buf.ay },
                { label: "z", color: "#005288", data: buf.accelZ },
              ]}
            />
          </TelemetryPanel>
        );
      case "gyro":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
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
          </TelemetryPanel>
        );
      case "mag":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
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
          </TelemetryPanel>
        );
      case "env":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col justify-center gap-3 px-3">
              <div>
                <p className="text-console-muted text-xs">pressure</p>
                <p className="text-xl font-semibold">{fmt(latest?.pressure)} hPa</p>
              </div>
              <div>
                <p className="text-console-muted text-xs">temperature</p>
                <p className="text-xl font-semibold">{fmt(latest?.temp)} &deg;C</p>
              </div>
            </div>
          </TelemetryPanel>
        );
      case "gps":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col">
              <div className="flex justify-between px-2 pb-1 text-xs text-console-muted">
                <span>{latest ? `${latest.sats} sats` : "-- sats"}</span>
                <span>{latest ? `fix ${latest.fix}` : "no fix"}</span>
                <span>{fmt(latest?.gpsAlt)} m</span>
              </div>
              <div className="flex-1 min-h-0">
                <TerrainMap
                  lat={latest?.lat ?? null}
                  lon={latest?.lon ?? null}
                  trail={trailRef.current}
                  altitudeFt={latest ? latest.altitude * 3.28084 : null}
                  maxAltitudeFt={31000}
                />
              </div>
            </div>
          </TelemetryPanel>
        );
      case "link":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col justify-center gap-3 px-3">
              <div>
                <p className="text-console-muted text-xs">rssi</p>
                <p className="text-xl font-semibold">{fmt(latest?.rssi, 0)} dBm</p>
              </div>
              <div>
                <p className="text-console-muted text-xs">snr</p>
                <p className="text-xl font-semibold">{fmt(latest?.snr)} dB</p>
              </div>
            </div>
          </TelemetryPanel>
        );
      case "continuity":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col justify-center gap-4 px-3">
              <ContinuityIndicator label="drogue" ok={!latest || latest.drogueCont === 1} />
              <ContinuityIndicator label="main" ok={!latest || latest.mainCont === 1} />
            </div>
          </TelemetryPanel>
        );
      case "battery":
        return (
          <TelemetryPanel key={id} label={group.label} color={group.color} onClose={() => toggleGroup(id)}>
            <div className="h-full flex flex-col justify-center px-3">
              <p className="text-console-muted text-xs">voltage</p>
              <p className="text-2xl font-semibold">{fmt(latest?.battery, 2)} V</p>
              <div className="h-1.5 w-full bg-console-border/15 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-console-safe"
                  style={{ width: `${latest ? Math.min(100, ((latest.battery - 6) / (8.4 - 6)) * 100) : 0}%` }}
                />
              </div>
            </div>
          </TelemetryPanel>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-2.25rem)] flex flex-col overflow-hidden">
      <Header
        title="Telemetry"
        isConnected={isConnected}
        isSimulating={isSimulating}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onToggleSimulate={handleToggleSimulate}
      />

      <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-b border-console-border/10 flex-wrap">
        <button
          onClick={() => setLeftOpen((v) => !v)}
          className="text-console-muted hover:text-console-text transition-colors"
          aria-label="toggle left sidebar"
        >
          {leftOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <select
          value={activePreset ?? ""}
          onChange={(e) => applyPreset(e.target.value)}
          className="bg-console-bg border border-console-border/20 rounded px-2 py-1 text-xs text-console-text"
        >
          <option value="" disabled>
            Presets
          </option>
          {TELEMETRY_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATE_META[derivedState].color }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: STATE_META[derivedState].color }}
          >
            {STATE_META[derivedState].label}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SerialConsole
            modeId="telemetry"
            sendCommand={sendCommand}
            log={log}
            onClearLog={() => setLog([])}
            preset={serialPreset}
            onPresetChange={setSerialPreset}
          />
          <DownloadCsvButton onClick={handleDownload} disabled={buf.t.length === 0} />
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="text-console-muted hover:text-console-text transition-colors"
            aria-label="toggle right sidebar"
          >
            {rightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {leftOpen && (
          <>
            <div
              style={{ width: leftWidth }}
              className="shrink-0 flex flex-col overflow-hidden p-2 gap-2"
            >
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {leftShown.map((id) => (
                  <div key={id} className="flex-1 min-h-0">
                    {renderGroupPanel(id)}
                  </div>
                ))}
                {leftShown.length === 0 && (
                  <p className="text-console-muted text-xs text-center py-6">nothing here, pick a preset</p>
                )}
              </div>
              {leftPages > 1 && (
                <div className="shrink-0 flex items-center justify-between px-1">
                  <button
                    onClick={() => setLeftPage((p) => Math.max(0, p - 1))}
                    disabled={leftPageClamped === 0}
                    className="text-console-muted hover:text-console-text disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-console-muted text-[10px] font-mono">
                    page {leftPageClamped + 1}/{leftPages}
                  </span>
                  <button
                    onClick={() => setLeftPage((p) => Math.min(leftPages - 1, p + 1))}
                    disabled={leftPageClamped === leftPages - 1}
                    className="text-console-muted hover:text-console-text disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <ResizeHandle onResize={(d) => setLeftWidth((w) => clampWidth(w + d))} />
          </>
        )}

        <div className="flex-1 min-w-0 p-2">
          <ExpandablePanel height="100%" className="flex flex-col">
            <p className="text-console-muted text-xs px-2 pt-1 shrink-0">
              3d flight trajectory, drag to orbit, colour follows the real derived phase
            </p>
            <div className="flex-1 min-h-0">
              <Flight3DPath points={path3DRef.current} />
            </div>
          </ExpandablePanel>
        </div>

        {rightOpen && (
          <>
            <ResizeHandle onResize={(d) => setRightWidth((w) => clampWidth(w - d))} />
            <div
              style={{ width: rightWidth }}
              className="shrink-0 flex flex-col overflow-hidden p-2 gap-2"
            >
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {rightShown.map((id) => (
                  <div key={id} className="flex-1 min-h-0">
                    {renderGroupPanel(id)}
                  </div>
                ))}
                {rightShown.length === 0 && (
                  <p className="text-console-muted text-xs text-center py-6">nothing here, pick a preset</p>
                )}
              </div>
              {rightPages > 1 && (
                <div className="shrink-0 flex items-center justify-between px-1">
                  <button
                    onClick={() => setRightPage((p) => Math.max(0, p - 1))}
                    disabled={rightPageClamped === 0}
                    className="text-console-muted hover:text-console-text disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-console-muted text-[10px] font-mono">
                    page {rightPageClamped + 1}/{rightPages}
                  </span>
                  <button
                    onClick={() => setRightPage((p) => Math.min(rightPages - 1, p + 1))}
                    disabled={rightPageClamped === rightPages - 1}
                    className="text-console-muted hover:text-console-text disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
