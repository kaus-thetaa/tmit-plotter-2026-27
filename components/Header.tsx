"use client";

import Link from "next/link";
import { ArrowLeft, Radio, RadioTower } from "lucide-react";

type HeaderProps = {
  title: string;
  isConnected: boolean;
  isSimulating: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleSimulate: () => void;
};

export const Header = ({
  title,
  isConnected,
  isSimulating,
  onConnect,
  onDisconnect,
  onToggleSimulate,
}: HeaderProps) => {
  const statusLabel = isConnected
    ? "connected"
    : isSimulating
    ? "simulating"
    : "idle";

  const statusColor = isConnected
    ? "text-console-safe"
    : isSimulating
    ? "text-console-accent"
    : "text-console-muted";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-console-border">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-console-muted hover:text-console-text transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-medium tracking-wide">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className={`flex items-center gap-2 text-sm ${statusColor}`}>
          {isConnected ? <RadioTower size={16} /> : <Radio size={16} />}
          {statusLabel}
        </span>

        <button
          onClick={isConnected ? onDisconnect : onConnect}
          className="panel px-3 py-1.5 text-sm hover:border-console-accent transition-colors"
        >
          {isConnected ? "disconnect" : "connect"}
        </button>

        <button
          onClick={onToggleSimulate}
          disabled={isConnected}
          className="panel px-3 py-1.5 text-sm hover:border-console-accent transition-colors disabled:opacity-40"
        >
          {isSimulating ? "stop sim" : "simulate"}
        </button>
      </div>
    </header>
  );
};
