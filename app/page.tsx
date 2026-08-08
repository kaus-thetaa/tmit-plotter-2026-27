import Link from "next/link";
import { Rocket, Radio, Gauge, SlidersHorizontal } from "lucide-react";

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
    desc: "live flight data and map",
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
    desc: "coming soon",
    icon: SlidersHorizontal,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-12 px-6">
      <div className="text-center space-y-2">
        <p className="text-console-accent text-sm tracking-[0.3em] uppercase">
          thrustmit
        </p>
        <h1 className="text-4xl font-semibold">ground station</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {modes.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="panel flex items-start gap-4 p-5 hover:border-console-accent transition-colors"
          >
            <Icon className="text-console-accent shrink-0" size={22} />
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-console-muted text-sm">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
