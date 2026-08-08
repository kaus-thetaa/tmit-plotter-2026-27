"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { useSerialPort } from "@/lib/serial/useSerialPort";
import { useSimulatedFeed } from "@/lib/simulate/useSimulatedFeed";
import { useOrientation } from "@/lib/imu/useOrientation";

const RocketModel = dynamic(() => import("@/components/RocketModel"), {
  ssr: false,
});

type Readouts = {
  altitude: number | null;
  lat: number | null;
  lon: number | null;
};

export default function DisplayPage() {
  const [readouts, setReadouts] = useState<Readouts>({
    altitude: null,
    lat: null,
    lon: null,
  });

  const { orientation, setFromEuler, reset } = useOrientation();

  const handleLine = useCallback(
    (line: string) => {
      // expected line format: roll,pitch,yaw,altitude,lat,lon
      const parts = line.split(",").map(Number);
      if (parts.length < 6 || parts.some(Number.isNaN)) return;
      const [roll, pitch, yaw, altitude, lat, lon] = parts;
      setFromEuler(roll, pitch, yaw);
      setReadouts({ altitude, lat, lon });
    },
    [setFromEuler]
  );

  const { isConnected, isSupported, connect, disconnect } =
    useSerialPort(handleLine);

  const generateFake = useCallback((elapsed: number) => {
    const roll = 15 * Math.sin(elapsed * 0.6);
    const pitch = 10 * Math.sin(elapsed * 0.4 + 1);
    const yaw = (elapsed * 20) % 360;
    const altitude = Math.max(0, 300 * Math.sin(elapsed * 0.1));
    const lat = 13.3465 + 0.0005 * Math.sin(elapsed * 0.2);
    const lon = 74.7935 + 0.0005 * Math.cos(elapsed * 0.2);
    return { roll, pitch, yaw, altitude, lat, lon };
  }, []);

  const { isSimulating, start, stop } = useSimulatedFeed(
    generateFake,
    (d) => {
      setFromEuler(d.roll, d.pitch, d.yaw);
      setReadouts({ altitude: d.altitude, lat: d.lat, lon: d.lon });
    },
    100
  );

  const handleToggleSimulate = () => {
    if (isSimulating) {
      stop();
      reset();
      setReadouts({ altitude: null, lat: null, lon: null });
    } else {
      start();
    }
  };

  const handleConnect = () => {
    if (!isSupported) {
      alert("web serial needs chrome or edge on desktop");
      return;
    }
    connect({ baudRate: 115200 });
  };

  const fmt = (v: number | null, digits = 1) =>
    v === null ? "--" : v.toFixed(digits);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Display"
        isConnected={isConnected}
        isSimulating={isSimulating}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onToggleSimulate={handleToggleSimulate}
      />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        <div className="lg:col-span-2 panel h-[480px]">
          <RocketModel orientation={orientation} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <p className="text-console-muted text-sm">altitude</p>
            <p className="text-3xl font-semibold">
              {fmt(readouts.altitude)}
              <span className="text-console-muted text-base"> m</span>
            </p>
          </div>

          <div className="panel p-5">
            <p className="text-console-muted text-sm">gps position</p>
            <p className="text-lg font-mono">
              {readouts.lat === null ? "--" : readouts.lat.toFixed(5)},{" "}
              {readouts.lon === null ? "--" : readouts.lon.toFixed(5)}
            </p>
          </div>

          <p className="text-console-muted text-xs px-1">
            attach an imu, pressure sensor, or gps over serial, or hit
            simulate to preview with fake data
          </p>
        </div>
      </main>
    </div>
  );
}
