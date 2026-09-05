"use client";

import { useCallback, useRef, useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import { UPlotChart } from "./UPlotChart";
import { DownloadCsvButton } from "./DownloadCsvButton";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import { downloadCsv } from "@/lib/csv/exportCsv";

type TestState = "idle" | "running" | "complete";

const SIM_TARGET_PSI = 500;

// standalone pt sanity check: pick a duration, see the expected wire
// format, watch it plot live, and pull a csv when it is done. its own
// connect and simulate since it is meant to be usable on its own,
// separate from the full static fire console above it
export const PTTestPanel = () => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [testState, setTestState] = useState<TestState>("idle");
  const [remaining, setRemaining] = useState(0);
  const [latest, setLatest] = useState<number | null>(null);

  const bufRef = useRef<{ t: number[]; pressure: number[] }>({ t: [], pressure: [] });
  const startRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const recordSample = useCallback((pressure: number) => {
    if (startRef.current === null) return;
    const t = (performance.now() - startRef.current) / 1000;
    if (t > durationRef.current) return;
    bufRef.current.t.push(t);
    bufRef.current.pressure.push(pressure);
    setLatest(pressure);
  }, []);

  const handleLine = useCallback(
    (line: string) => {
      const value = Number(line.trim());
      if (Number.isNaN(value)) return;
      recordSample(value);
    },
    [recordSample]
  );

  const { isConnected, isSupported, connect, disconnect } = useSerialPort(handleLine);

  const generateFake = useCallback((elapsed: number) => {
    const rampTime = Math.min(durationRef.current * 0.15, 5);
    if (elapsed < rampTime && rampTime > 0) {
      return SIM_TARGET_PSI * (elapsed / rampTime) + (Math.random() - 0.5) * 5;
    }
    return SIM_TARGET_PSI + (Math.random() - 0.5) * 8 + Math.sin(elapsed * 0.5) * 3;
  }, []);

  const { isSimulating, start: startSim, stop: stopSim } = useSimulatedFeed(
    generateFake,
    (value) => recordSample(value),
    100
  );

  const startTest = () => {
    const duration = minutes * 60 + seconds;
    if (duration <= 0 || (!isConnected && !isSimulating)) return;
    durationRef.current = duration;
    bufRef.current = { t: [], pressure: [] };
    setLatest(null);
    startRef.current = performance.now();
    setRemaining(duration);
    setTestState("running");

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - (startRef.current ?? 0)) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTestState("complete");
      }
    }, 200);
  };

  const stopTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTestState("complete");
  };

  const resetTest = () => {
    bufRef.current = { t: [], pressure: [] };
    setLatest(null);
    setTestState("idle");
  };

  const handleDownload = () => {
    downloadCsv(
      `pt-test-${Date.now()}.csv`,
      ["time_s", "pressure_psi"],
      [bufRef.current.t, bufRef.current.pressure]
    );
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleConnect = () => {
    if (!isSupported) {
      alert("web serial needs chrome or edge on desktop");
      return;
    }
    connect({ baudRate: 115200 });
  };

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium text-sm">PT Test</p>
          <p className="text-console-muted text-xs mt-0.5">
            quick pressure transducer check over a timed window
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isConnected ? disconnect : handleConnect}
            disabled={testState === "running"}
            className="panel px-3 py-1.5 text-xs hover:border-console-accent transition-colors disabled:opacity-30"
          >
            {isConnected ? "disconnect" : "connect"}
          </button>
          <button
            onClick={() => (isSimulating ? stopSim() : startSim())}
            disabled={isConnected || testState === "running"}
            className="panel px-3 py-1.5 text-xs hover:border-console-accent transition-colors disabled:opacity-30"
          >
            {isSimulating ? "stop sim" : "simulate"}
          </button>
        </div>
      </div>

      <p className="text-console-muted text-xs">
        expected serial format: pressure only, one reading per line, e.g.{" "}
        <code className="text-console-text">820.5</code>
      </p>

      {testState === "idle" && (
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-console-muted text-xs block mb-1">minutes</label>
            <input
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
              className="w-20 bg-console-bg border border-console-border/20 rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-console-muted text-xs block mb-1">seconds</label>
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
              className="w-20 bg-console-bg border border-console-border/20 rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={startTest}
            disabled={!isConnected && !isSimulating}
            className="panel px-4 py-1.5 text-sm flex items-center gap-1.5 hover:border-console-safe transition-colors disabled:opacity-30"
          >
            <Play size={14} /> start test
          </button>
        </div>
      )}

      {testState !== "idle" && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-console-muted text-xs">time remaining</p>
              <p className="text-2xl font-mono font-semibold">{formatTime(remaining)}</p>
            </div>
            <div>
              <p className="text-console-muted text-xs">reading</p>
              <p className="text-2xl font-semibold">
                {latest === null ? "--" : latest.toFixed(1)} psi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testState === "running" && (
              <button
                onClick={stopTest}
                className="panel px-3 py-1.5 text-xs flex items-center gap-1.5 hover:border-console-critical transition-colors"
              >
                <Square size={12} /> stop
              </button>
            )}
            {testState === "complete" && (
              <>
                <DownloadCsvButton onClick={handleDownload} label="download csv" />
                <button
                  onClick={resetTest}
                  className="panel px-3 py-1.5 text-xs flex items-center gap-1.5 hover:border-console-accent transition-colors"
                >
                  <RotateCcw size={12} /> new test
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {bufRef.current.t.length > 1 && (
        <UPlotChart
          label="Pressure"
          unit="psi"
          color="#D1480F"
          data={[bufRef.current.t, bufRef.current.pressure]}
        />
      )}
    </div>
  );
};
