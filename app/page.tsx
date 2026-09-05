"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Rocket, Radio, Gauge, SlidersHorizontal, Settings } from "lucide-react";

const RevolvingGlobe = dynamic(() => import("@/components/RevolvingGlobe"), {
  ssr: false,
});

const modes = [
  {
    href: "/display",
    label: "Display",
    desc: "booth demo with live 3d model",
    icon: Rocket,
  },
  {
    href: "/telemetry",
    label: "Telemetry",
    desc: "live flight data and gps map",
    icon: Radio,
  },
  {
    href: "/motor",
    label: "Motor Test",
    desc: "ground test console",
    icon: Gauge,
  },
  {
    href: "/filters",
    label: "Filters",
    desc: "upload and analyze csv data",
    icon: SlidersHorizontal,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative">
      <Link
        href="/settings"
        className="absolute top-5 right-5 z-10 text-console-muted hover:text-console-text transition-colors"
      >
        <Settings size={20} />
      </Link>

      <section className="relative min-h-[72vh] flex items-center overflow-hidden">
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          <div className="space-y-4">
            <p className="text-console-accent text-sm tracking-[0.3em]">
              thrustMIT
            </p>
            <h1 className="text-5xl font-semibold leading-tight">
              ground station
            </h1>
            <p className="text-console-muted max-w-sm">
              live telemetry, ground test control, and mission display for
              every launch
            </p>
          </div>

          <div className="h-64 md:h-80">
            <RevolvingGlobe />
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
          {modes.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="panel flex items-start gap-4 p-5 hover:border-console-accent/60 transition-colors"
            >
              <Icon className="text-console-accent shrink-0" size={22} />
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-console-muted text-sm">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
