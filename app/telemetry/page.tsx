"use client";

import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { GraphGrid, type GraphChannel } from "@/components/GraphGrid";
import { TerrainMap } from "@/components/TerrainMap";
import { ExpandablePanel } from "@/components/ExpandablePanel";
import { DownloadCsvButton } from "@/components/DownloadCsvButton";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import { downloadCsv } from "@/lib/csv/exportCsv";

const BUFFER_SIZE = 300;
const TRAIL_LIMIT = 200;

type Sample = {
  t: number;
  altitude: number;
  velocity: number;
  acceleration: number;
  lat: number;
  lon: number;
};

const emptyBuffers = () => ({
  t: [] as number[],
  altitude: [] as number[],
  velocity: [] as number[],
  acceleration: [] as number[],
  lat: [] as number[],
  lon: [] as number[],
});

export default function TelemetryPage() {
  const buffersRef = useRef(emptyBuffers());
  const trailRef = useRef<[number, number][]>([]);
  const [channels, setChannels] = useState<GraphChannel[]>([]);
  const [latest, setLatest] = useState<Sample | null>(null);

  const pushSample = useCallback((sample: Sample) => {
    const buf = buffersRef.current;
    buf.t.push(sample.t);
    buf.altitude.push(sample.altitude);
    buf.velocity.push(sample.velocity);
    buf.acceleration.push(sample.acceleration);
    buf.lat.push(sample.lat);
    buf.lon.push(sample.lon);

    if (buf.t.length > BUFFER_SIZE) {
      buf.t.shift();
      buf.altitude.shift();
      buf.velocity.shift();
      buf.acceleration.shift();
      buf.lat.shift();
      buf.lon.shift();
    }

    trailRef.current.push([sample.lon, sample.lat]);
    if (trailRef.current.length > TRAIL_LIMIT) trailRef.current.shift();

    setLatest(sample);
    setChannels([
      {
        id: "altitude",
        label: "Altitude",
        unit: "m",
        color: "#005288",
        data: [buf.t, buf.altitude],
      },
      {
        id: "velocity",
        label: "Velocity",
        unit: "m/s",
        color: "#1D7373",
        data: [buf.t, buf.velocity],
      },
      {
        id: "acceleration",
        label: "Acceleration",
        unit: "m/s2",
        color: "#D1480F",
        data: [buf.t, buf.acceleration],
      },
    ]);
  }, []);

  const startTimeRef = useRef<number | null>(null);

  const handleLine = useCallback(
    (line: string) => {
      // expected line format: altitude,velocity,acceleration,lat,lon
      const parts = line.split(",").map(Number);
      if (parts.length < 5 || parts.some(Number.isNaN)) return;
      if (startTimeRef.current === null) startTimeRef.current = performance.now();
      const t = (performance.now() - startTimeRef.current) / 1000;
      pushSample({
        t,
        altitude: parts[0],
        velocity: parts[1],
        acceleration: parts[2],
        lat: parts[3],
        lon: parts[4],
      });
    },
    [pushSample]
  );

  const { isConnected, isSupported, connect, disconnect } =
    useSerialPort(handleLine);

  const generateFake = useCallback((elapsed: number) => {
    // bounded, looping flight arc: burn, coast to apogee, descend,
    // clamp to zero on landing instead of letting velocity run away,
    // then loop back to launch
    const CYCLE = 20;
    const ASCENT_END = 3;
    const BURN_ACCEL = 60;
    const FALL_ACCEL = 40;

    const vBurnout = BURN_ACCEL * ASCENT_END;
    const altBurnout = 0.5 * BURN_ACCEL * ASCENT_END * ASCENT_END;
    const coastDuration = vBurnout / FALL_ACCEL;
    const APOGEE_T = ASCENT_END + coastDuration;
    const altApogee =
      altBurnout + vBurnout * coastDuration - 0.5 * FALL_ACCEL * coastDuration * coastDuration;

    const t = elapsed % CYCLE;
    let altitude: number;
    let velocity: number;
    let acceleration: number;

    if (t < ASCENT_END) {
      acceleration = BURN_ACCEL;
      velocity = BURN_ACCEL * t;
      altitude = 0.5 * BURN_ACCEL * t * t;
    } else if (t < APOGEE_T) {
      const t2 = t - ASCENT_END;
      acceleration = -FALL_ACCEL;
      velocity = vBurnout - FALL_ACCEL * t2;
      altitude = altBurnout + vBurnout * t2 - 0.5 * FALL_ACCEL * t2 * t2;
    } else {
      const t3 = t - APOGEE_T;
      const rawAltitude = altApogee - 0.5 * FALL_ACCEL * t3 * t3;
      if (rawAltitude <= 0) {
        // landed, hold at rest until the cycle loops back to launch
        altitude = 0;
        velocity = 0;
        acceleration = 0;
      } else {
        altitude = rawAltitude;
        velocity = -FALL_ACCEL * t3;
        acceleration = -FALL_ACCEL;
      }
    }

    const lat = 13.3465 + 0.0008 * Math.sin(elapsed * 0.15);
    const lon = 74.7935 + 0.0008 * Math.cos(elapsed * 0.15);

    return { altitude: Math.max(0, altitude), velocity, acceleration, lat, lon };
  }, []);

  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      const t = buffersRef.current.t.length
        ? buffersRef.current.t[buffersRef.current.t.length - 1] + 0.1
        : 0;
      pushSample({
        t,
        altitude: d.altitude,
        velocity: d.velocity,
        acceleration: d.acceleration,
        lat: d.lat,
        lon: d.lon,
      });
    },
    100
  );

  const handleToggleSimulate = () => {
    if (isSimulating) {
      stop();
    } else {
      buffersRef.current = emptyBuffers();
      trailRef.current = [];
      setChannels([]);
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
    setChannels([]);
    connect({ baudRate: 115200 });
  };

  const handleDownload = () => {
    const buf = buffersRef.current;
    downloadCsv(
      `telemetry-${Date.now()}.csv`,
      ["time_s", "altitude_m", "velocity_mps", "acceleration_mps2", "lat", "lon"],
      [buf.t, buf.altitude, buf.velocity, buf.acceleration, buf.lat, buf.lon]
    );
  };

  const fmt = (v: number | undefined, digits = 1) =>
    v === undefined ? "--" : v.toFixed(digits);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Telemetry"
        isConnected={isConnected}
        isSimulating={isSimulating}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onToggleSimulate={handleToggleSimulate}
      />

      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-end">
          <DownloadCsvButton
            onClick={handleDownload}
            disabled={buffersRef.current.t.length === 0}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="panel p-4">
            <p className="text-console-muted text-sm">altitude</p>
            <p className="text-2xl font-semibold">{fmt(latest?.altitude)} m</p>
          </div>
          <div className="panel p-4">
            <p className="text-console-muted text-sm">velocity</p>
            <p className="text-2xl font-semibold">{fmt(latest?.velocity)} m/s</p>
          </div>
          <div className="panel p-4">
            <p className="text-console-muted text-sm">acceleration</p>
            <p className="text-2xl font-semibold">{fmt(latest?.acceleration)} m/s2</p>
          </div>
        </div>

        <ExpandablePanel height="320px">
          <TerrainMap
            lat={latest?.lat ?? null}
            lon={latest?.lon ?? null}
            trail={trailRef.current}
            altitudeFt={latest ? latest.altitude * 3.28084 : null}
            maxAltitudeFt={2200}
          />
        </ExpandablePanel>

        {channels.length > 0 ? (
          <GraphGrid channels={channels} />
        ) : (
          <p className="text-console-muted text-sm">
            connect a device or hit simulate to see live charts
          </p>
        )}
      </main>
    </div>
  );
}
