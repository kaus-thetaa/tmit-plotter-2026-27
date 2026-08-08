# tMIT Plotter 2026-27

ThrustMIT's ground station and telemetry console. A rebuild of the
2025-26 plotter with a cleaner architecture, four modes in one app, and
a simulated data fallback so every mode works with any combination of
hardware attached, or none at all.

## Modes

- **Display** — booth demo mode. Shows a live 3D rocket model that
  rotates with connected IMU orientation data, plus altitude and GPS
  readouts. Drop your own `.obj` file into `public/models/` and point
  `RocketModel` at it to replace the placeholder shape.
- **Telemetry** — live flight data console with rolling altitude,
  velocity, and acceleration charts.
- **Motor Test** — ground test console with a safe/armed/burn/complete
  state machine and declarative channel thresholds (pressure, thrust,
  casing temperature).
- **Filters** — coming soon.

Every mode has a **connect** button (Web Serial, Chrome or Edge on
desktop only) and a **simulate** button that generates realistic fake
data when no hardware is plugged in.

## Stack

Next.js 14 (static export), TypeScript, Tailwind, uPlot for charts,
react-three-fiber for the 3D model, Web Serial API for hardware — no
backend, so the whole thing can be hosted as a static site.

## Local setup

```
npm install
npm run dev
```

## Deploying to GitHub Pages

```
npm run build
```

This outputs a static site to `/out`. Point GitHub Pages at that
folder, or push it to a `gh-pages` branch.

## Serial packet formats

- **Display**: `roll,pitch,yaw,altitude,lat,lon`
- **Telemetry**: `altitude,velocity,acceleration`
- **Motor**: `pressure,thrust,temp`

All comma-separated, one line per sample, newline-terminated.
