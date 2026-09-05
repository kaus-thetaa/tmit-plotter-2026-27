"use client";

import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { GraphGrid, type GraphChannel } from "@/components/GraphGrid";
import { HoldToLaunchButton } from "@/components/HoldToLaunchButton";
import { DownloadCsvButton } from "@/components/DownloadCsvButton";
import { SerialConsole } from "@/components/SerialConsole";
import { PTTestPanel } from "@/components/PTTestPanel";
import type { LogLine } from "@/components/SerialMonitor";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import { useMotorStateMachine, MotorState } from "@/lib/motor/stateMachine";
import { MOTOR_CHANNELS, getChannelStatus } from "@/lib/motor/channelConfig";
import { downloadCsv } from "@/lib/csv/exportCsv";
import { unwrapLine, type SerialPreset } from "@/lib/serial/protocols";

const BUFFER_SIZE = 400;

const emptyBuffers = () => ({
  t: [] as number[],
  pressure: [] as number[],
  thrust: [] as number[],
  temp: [] as number[],
});

export default function MotorPage() {
  const buffersRef = useRef(emptyBuffers());
  const [channels, setChannels] = useState<GraphChannel[]>([]);
  const [latest, setLatest] = useState<{ pressure: number; thrust: number; temp: number } | null>(
    null
  );

  const motor = useMotorStateMachine(20);
  const startTimeRef = useRef<number | null>(null);
  const burnStartIndexRef = useRef<number | null>(null);
  const [summary, setSummary] = useState<{
    peakThrust: number;
    peakPressure: number;
    totalImpulse: number;
    burnDuration: number;
  } | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [preset, setPreset] = useState<SerialPreset>("direct");

  const appendLog = useCallback((text: string) => {
    setLog((prev) => {
      const next = [...prev, { time: new Date().toLocaleTimeString(), text }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const pushSample = useCallback(
    (t: number, pressure: number, thrust: number, temp: number) => {
      const buf = buffersRef.current;
      buf.t.push(t);
      buf.pressure.push(pressure);
      buf.thrust.push(thrust);
      buf.temp.push(temp);

      if (buf.t.length > BUFFER_SIZE) {
        buf.t.shift();
        buf.pressure.shift();
        buf.thrust.shift();
        buf.temp.shift();
      }

      setLatest({ pressure, thrust, temp });
      setChannels(
        MOTOR_CHANNELS.map((c) => ({
          id: c.id,
          label: c.label,
          unit: c.unit,
          color: c.color,
          data: [buf.t, buf[c.id]] as [number[], number[]],
        }))
      );
    },
    []
  );

  const handleLine = useCallback(
    (line: string) => {
      appendLog(line);
      const unwrapped = unwrapLine(line, preset);
      if (!unwrapped) return;
      // expected line format: pressure,thrust,temp
      const parts = unwrapped.payload.split(",").map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return;
      if (startTimeRef.current === null) startTimeRef.current = performance.now();
      const t = (performance.now() - startTimeRef.current) / 1000;
      pushSample(t, parts[0], parts[1], parts[2]);
    },
    [pushSample, appendLog, preset]
  );

  const { isConnected, isSupported, connect, disconnect, sendCommand } =
    useSerialPort(handleLine);

  const generateFake = useCallback(
    (elapsed: number) => {
      if (motor.state !== MotorState.Burn) {
        return { pressure: 0, thrust: 0, temp: 20 };
      }
      const burnLength = 20;
      const t = Math.min(elapsed, burnLength);
      const shape = Math.sin((Math.PI * t) / burnLength);
      return {
        pressure: 900 * shape,
        thrust: 1800 * shape,
        temp: 20 + 250 * (t / burnLength),
      };
    },
    [motor.state]
  );

  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      const buf = buffersRef.current;
      const t = buf.t.length ? buf.t[buf.t.length - 1] + 0.1 : 0;
      pushSample(t, d.pressure, d.thrust, d.temp);
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
      setSummary(null);
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
    setSummary(null);
    connect({ baudRate: 115200 });
  };

  const handleDownload = () => {
    const buf = buffersRef.current;
    downloadCsv(
      `motor-test-${Date.now()}.csv`,
      ["time_s", "pressure_psi", "thrust_n", "temp_c"],
      [buf.t, buf.pressure, buf.thrust, buf.temp]
    );
  };

  const handleLaunch = useCallback(() => {
    burnStartIndexRef.current = buffersRef.current.t.length;
    setSummary(null);
    motor.launch();
  }, [motor]);

  const handleComplete = useCallback(() => {
    const buf = buffersRef.current;
    const startIdx = burnStartIndexRef.current ?? 0;
    const tSlice = buf.t.slice(startIdx);
    const thrustSlice = buf.thrust.slice(startIdx);
    const pressureSlice = buf.pressure.slice(startIdx);

    if (tSlice.length > 1) {
      let impulse = 0;
      for (let i = 1; i < tSlice.length; i++) {
        const dt = tSlice[i] - tSlice[i - 1];
        impulse += ((thrustSlice[i] + thrustSlice[i - 1]) / 2) * dt;
      }
      setSummary({
        peakThrust: Math.max(...thrustSlice),
        peakPressure: Math.max(...pressureSlice),
        totalImpulse: impulse,
        burnDuration: tSlice[tSlice.length - 1] - tSlice[0],
      });
    }
    motor.complete();
  }, [motor]);

  const stateColor: Record<MotorState, string> = {
    [MotorState.Safe]: "text-console-safe",
    [MotorState.Armed]: "text-console-armed",
    [MotorState.Burn]: "text-console-critical",
    [MotorState.Complete]: "text-console-accent",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Motor Test"
        isConnected={isConnected}
        isSimulating={isSimulating}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onToggleSimulate={handleToggleSimulate}
      />

      <div className="flex justify-end px-6 pt-2">
        <SerialConsole
          modeId="motor"
          sendCommand={sendCommand}
          log={log}
          onClearLog={() => setLog([])}
          preset={preset}
          onPresetChange={setPreset}
        />
      </div>

      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-end">
          <DownloadCsvButton
            onClick={handleDownload}
            disabled={buffersRef.current.t.length === 0}
          />
        </div>

        <div className="panel p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-console-muted text-sm">state</p>
            <p className={`text-2xl font-semibold uppercase ${stateColor[motor.state]}`}>
              {motor.state}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={motor.arm}
              disabled={motor.state !== MotorState.Safe}
              className="panel px-4 py-2 text-sm hover:border-console-armed disabled:opacity-30"
            >
              arm
            </button>
            <HoldToLaunchButton
              disabled={motor.state !== MotorState.Armed}
              onConfirm={handleLaunch}
            />
            <button
              onClick={handleComplete}
              disabled={motor.state !== MotorState.Burn}
              className="panel px-4 py-2 text-sm hover:border-console-accent disabled:opacity-30"
            >
              complete
            </button>
            <button
              onClick={motor.reset}
              disabled={motor.state !== MotorState.Complete}
              className="panel px-4 py-2 text-sm hover:border-console-safe disabled:opacity-30"
            >
              reset
            </button>
            <button
              onClick={motor.safe}
              disabled={motor.state === MotorState.Safe}
              className="panel px-4 py-2 text-sm hover:border-console-safe disabled:opacity-30"
            >
              abort to safe
            </button>
          </div>
        </div>

        {summary && (
          <div className="panel p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-console-muted text-xs">peak thrust</p>
              <p className="text-xl font-semibold">{summary.peakThrust.toFixed(0)} N</p>
            </div>
            <div>
              <p className="text-console-muted text-xs">peak pressure</p>
              <p className="text-xl font-semibold">{summary.peakPressure.toFixed(0)} psi</p>
            </div>
            <div>
              <p className="text-console-muted text-xs">total impulse</p>
              <p className="text-xl font-semibold">{summary.totalImpulse.toFixed(0)} N&middot;s</p>
            </div>
            <div>
              <p className="text-console-muted text-xs">burn duration</p>
              <p className="text-xl font-semibold">{summary.burnDuration.toFixed(2)} s</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {MOTOR_CHANNELS.map((c) => {
            const value = latest?.[c.id] ?? 0;
            const status = getChannelStatus(c, value);
            const statusColor =
              status === "critical"
                ? "text-console-critical"
                : status === "warning"
                ? "text-console-warn"
                : "text-console-text";
            return (
              <div key={c.id} className="panel p-4">
                <p className="text-console-muted text-sm">{c.label}</p>
                <p className={`text-2xl font-semibold ${statusColor}`}>
                  {latest ? value.toFixed(1) : "--"}{" "}
                  <span className="text-console-muted text-base">{c.unit}</span>
                </p>
              </div>
            );
          })}
        </div>

        {channels.length > 0 ? (
          <GraphGrid channels={channels} />
        ) : (
          <p className="text-console-muted text-sm">
            connect the test stand or hit simulate, then arm and launch to see a burn
          </p>
        )}

        <PTTestPanel />
      </main>
    </div>
  );
}
