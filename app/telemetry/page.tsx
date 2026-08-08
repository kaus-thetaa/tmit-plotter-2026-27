"use client";

import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { GraphGrid, type GraphChannel } from "@/components/GraphGrid";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";

const BUFFER_SIZE = 300;

type Sample = {
  t: number;
  altitude: number;
  velocity: number;
  acceleration: number;
};

const emptyBuffers = () => ({
  t: [] as number[],
  altitude: [] as number[],
  velocity: [] as number[],
  acceleration: [] as number[],
});

export default function TelemetryPage() {
  const buffersRef = useRef(emptyBuffers());
  const [channels, setChannels] = useState<GraphChannel[]>([]);
  const [latest, setLatest] = useState<Sample | null>(null);

  const pushSample = useCallback((sample: Sample) => {
    const buf = buffersRef.current;
    buf.t.push(sample.t);
    buf.altitude.push(sample.altitude);
    buf.velocity.push(sample.velocity);
    buf.acceleration.push(sample.acceleration);

    if (buf.t.length > BUFFER_SIZE) {
      buf.t.shift();
      buf.altitude.shift();
      buf.velocity.shift();
      buf.acceleration.shift();
    }

    setLatest(sample);
    setChannels([
      {
        id: "altitude",
        label: "Altitude",
        unit: "m",
        color: "#4fc3f7",
        data: [buf.t, buf.altitude],
      },
      {
        id: "velocity",
        label: "Velocity",
        unit: "m/s",
        color: "#4caf50",
        data: [buf.t, buf.velocity],
      },
      {
        id: "acceleration",
        label: "Acceleration",
        unit: "m/s2",
        color: "#e8a040",
        data: [buf.t, buf.acceleration],
      },
    ]);
  }, []);

  const startTimeRef = useRef<number | null>(null);

  const handleLine = useCallback(
    (line: string) => {
      // expected line format: altitude,velocity,acceleration
      const parts = line.split(",").map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return;
      if (startTimeRef.current === null) startTimeRef.current = performance.now();
      const t = (performance.now() - startTimeRef.current) / 1000;
      pushSample({ t, altitude: parts[0], velocity: parts[1], acceleration: parts[2] });
    },
    [pushSample]
  );

  const { isConnected, isSupported, connect, disconnect } =
    useSerialPort(handleLine);

  const generateFake = useCallback((elapsed: number) => {
    // rough ascent, coast, descent profile
    const burnout = 4;
    const apogee = 12;
    let altitude: number;
    let velocity: number;
    let acceleration: number;

    if (elapsed < burnout) {
      acceleration = 60;
      velocity = acceleration * elapsed;
      altitude = 0.5 * acceleration * elapsed * elapsed;
    } else if (elapsed < apogee) {
      const t = elapsed - burnout;
      acceleration = -9.8;
      const vBurnout = 60 * burnout;
      velocity = vBurnout + acceleration * t;
      const altBurnout = 0.5 * 60 * burnout * burnout;
      altitude = altBurnout + vBurnout * t + 0.5 * acceleration * t * t;
    } else {
      const t = elapsed - apogee;
      acceleration = -9.8;
      velocity = -9.8 * t;
      const altApogee = 0.5 * 60 * burnout * burnout + 60 * burnout * (apogee - burnout) - 4.9 * (apogee - burnout) ** 2;
      altitude = Math.max(0, altApogee + velocity * t * 0.5);
    }

    return { altitude: Math.max(0, altitude), velocity, acceleration };
  }, []);

  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      const t = buffersRef.current.t.length
        ? buffersRef.current.t[buffersRef.current.t.length - 1] + 0.1
        : 0;
      pushSample({ t, altitude: d.altitude, velocity: d.velocity, acceleration: d.acceleration });
    },
    100
  );

  const handleToggleSimulate = () => {
    if (isSimulating) {
      stop();
    } else {
      buffersRef.current = emptyBuffers();
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
    setChannels([]);
    connect({ baudRate: 115200 });
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
