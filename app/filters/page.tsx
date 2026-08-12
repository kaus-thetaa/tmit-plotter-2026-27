"use client";

import { useCallback, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { GraphGrid, type GraphChannel } from "@/components/GraphGrid";
import {
  parseCsv,
  detectColumns,
  movingAverage,
  type ParsedCsv,
} from "@/lib/csv/parseCsv";
import { Upload } from "lucide-react";
import { downloadCsv } from "@/lib/csv/exportCsv";
import { DownloadCsvButton } from "@/components/DownloadCsvButton";

export default function FiltersPage() {
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState(0);
  const [valueIndex, setValueIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(5);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      const detected = detectColumns(parsed.headers);
      setCsv(parsed);
      setFileName(file.name);
      setTimeIndex(detected.timeIndex);
      setValueIndex(detected.accelIndex);
    };
    reader.readAsText(file);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const channels: GraphChannel[] = useMemo(() => {
    if (!csv) return [];
    const t = csv.columns[timeIndex] ?? [];
    const raw = csv.columns[valueIndex] ?? [];
    const filtered = movingAverage(raw, windowSize);

    return [
      {
        id: "raw",
        label: `${csv.headers[valueIndex]} (raw)`,
        unit: "",
        color: "#B6B6B6",
        data: [t, raw],
      },
      {
        id: "filtered",
        label: `${csv.headers[valueIndex]} (filtered)`,
        unit: "",
        color: "#005288",
        data: [t, filtered],
      },
    ];
  }, [csv, timeIndex, valueIndex, windowSize]);

  const handleExportFiltered = () => {
    if (!csv) return;
    const t = csv.columns[timeIndex] ?? [];
    const raw = csv.columns[valueIndex] ?? [];
    const filtered = movingAverage(raw, windowSize);
    downloadCsv(
      `filtered-${csv.headers[valueIndex]}-${Date.now()}.csv`,
      [csv.headers[timeIndex], `${csv.headers[valueIndex]}_raw`, `${csv.headers[valueIndex]}_filtered`],
      [t, raw, filtered]
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Filters"
        isConnected={false}
        isSimulating={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onToggleSimulate={() => {}}
      />

      <main className="flex-1 p-6 space-y-6">
        <div className="panel p-6 flex flex-col items-center justify-center gap-3 border-dashed">
          <Upload className="text-console-accent" size={28} />
          <p className="text-console-muted text-sm text-center">
            {fileName ?? "upload a csv to test filters against real data"}
          </p>
          <label className="panel px-4 py-2 text-sm cursor-pointer hover:border-console-accent transition-colors">
            choose file
            <input
              type="file"
              accept=".csv"
              onChange={onInputChange}
              className="hidden"
            />
          </label>
        </div>

        {csv && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="panel p-4">
                <p className="text-console-muted text-sm mb-2">time column</p>
                <select
                  value={timeIndex}
                  onChange={(e) => setTimeIndex(Number(e.target.value))}
                  className="w-full bg-console-bg border border-console-border/25 rounded px-2 py-1.5 text-sm"
                >
                  {csv.headers.map((h, i) => (
                    <option key={h} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="panel p-4">
                <p className="text-console-muted text-sm mb-2">value column</p>
                <select
                  value={valueIndex}
                  onChange={(e) => setValueIndex(Number(e.target.value))}
                  className="w-full bg-console-bg border border-console-border/25 rounded px-2 py-1.5 text-sm"
                >
                  {csv.headers.map((h, i) => (
                    <option key={h} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="panel p-4">
                <p className="text-console-muted text-sm mb-2">
                  moving average window: {windowSize}
                </p>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={windowSize}
                  onChange={(e) => setWindowSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <DownloadCsvButton onClick={handleExportFiltered} label="download filtered csv" />
            </div>

            <GraphGrid channels={channels} />
          </>
        )}
      </main>
    </div>
  );
}
