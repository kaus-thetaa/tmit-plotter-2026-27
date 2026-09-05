"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSettings } from "@/lib/settings/useSettings";

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full transition-colors relative ${
      checked ? "bg-console-accent" : "bg-console-border/30"
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-console-text transition-transform ${
        checked ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

export default function SettingsPage() {
  const { idleAttractEnabled, setIdleAttractEnabled, audioEnabled, setAudioEnabled } =
    useSettings();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-console-border/20">
        <Link href="/" className="text-console-muted hover:text-console-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-medium tracking-wide">Settings</h1>
      </header>

      <main className="flex-1 p-6 max-w-md space-y-4">
        <div className="panel p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Idle attract mode</p>
            <p className="text-console-muted text-xs mt-0.5">
              display mode auto cycles through the sim and achievements when
              no one has interacted for a while
            </p>
          </div>
          <Toggle checked={idleAttractEnabled} onChange={setIdleAttractEnabled} />
        </div>

        <div className="panel p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sound effects</p>
            <p className="text-console-muted text-xs mt-0.5">
              short tones on flight phase changes during display mode's
              simulation
            </p>
          </div>
          <Toggle checked={audioEnabled} onChange={setAudioEnabled} />
        </div>
      </main>
    </div>
  );
}
