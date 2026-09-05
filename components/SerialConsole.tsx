"use client";

import { useState } from "react";
import { Radio, Terminal, Copy, Check } from "lucide-react";
import { ExpectedStreamsInfo } from "./ExpectedStreamsInfo";
import { SerialMonitor, type LogLine } from "./SerialMonitor";
import { AT_QUICK_COMMANDS, MODE_FORMATS, type ModeId, type SerialPreset } from "@/lib/serial/protocols";

type SerialConsoleProps = {
  modeId: ModeId;
  sendCommand: (cmd: string) => void;
  log: LogLine[];
  onClearLog: () => void;
  preset: SerialPreset;
  onPresetChange: (p: SerialPreset) => void;
};

// the flagship shared console: one preset selector deciding how
// incoming lines are unwrapped, a reference card for what each mode
// expects on the wire, and an at command console for talking
// directly to a rylr998 without leaving the page. collapsed by
// default so it never competes for attention with the mode's own data
export const SerialConsole = ({
  modeId,
  sendCommand,
  log,
  onClearLog,
  preset,
  onPresetChange,
}: SerialConsoleProps) => {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const format = MODE_FORMATS[modeId];

  const handleSend = () => {
    if (!command.trim()) return;
    sendCommand(command.trim());
    setCommand("");
  };

  const exampleSnippet =
    preset === "lora-tx"
      ? `AT+SEND=<addr>,<len>,${format.example}`
      : preset === "lora-rx"
      ? `+RCV=<addr>,<len>,${format.example},<rssi>,<snr>`
      : `Serial.println("${format.example}");`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as SerialPreset)}
          className="bg-console-bg border border-console-border/20 rounded px-2 py-1 text-xs text-console-text"
        >
          <option value="direct">Direct (CSV)</option>
          <option value="lora-rx">LoRa Receiver</option>
          <option value="lora-tx">LoRa Transmitter</option>
        </select>

        <ExpectedStreamsInfo
          directFormat={format.columns}
          loraRxFormat={`+RCV=Addr,Len,${format.columns},RSSI,SNR`}
          loraTxFormat={`AT+SEND=Addr,Len,${format.columns}`}
        />

        <button
          onClick={() => setOpen((v) => !v)}
          className={`transition-colors ${open ? "text-console-accent" : "text-console-muted hover:text-console-text"}`}
          aria-label="toggle console"
        >
          <Terminal size={15} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 panel p-3 w-80 space-y-2">
          <p className="text-console-muted text-xs flex items-center gap-1.5">
            <Radio size={12} /> talk to rylr998
          </p>

          <div className="h-28">
            <SerialMonitor lines={log} onClear={onClearLog} />
          </div>

          <div className="flex flex-wrap gap-1">
            {AT_QUICK_COMMANDS.map((c) => (
              <button
                key={c.cmd}
                onClick={() => sendCommand(c.cmd)}
                className="px-2 py-1 text-[10px] rounded border border-console-border/20 text-console-muted hover:border-console-accent hover:text-console-text transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="AT+SEND=..."
              className="flex-1 bg-console-bg border border-console-border/20 rounded px-2 py-1 text-xs font-mono"
            />
            <button
              onClick={handleSend}
              className="px-2.5 py-1 text-xs rounded bg-console-accent text-console-text shrink-0"
            >
              send
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded border border-console-border/20 text-console-muted hover:border-console-accent hover:text-console-text transition-colors"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "copied" : "push example code"}
          </button>
        </div>
      )}
    </div>
  );
};
