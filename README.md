# tMIT Plotter 2026-27

ThrustMIT's ground station and telemetry console. Four modes in one app,
a simulated data fallback so every mode works with any combination of
hardware attached, or none at all, and a csv workflow in both directions.

## Modes

- **Display** — booth demo mode. Live 3D rocket model driven by connected
  IMU orientation, altitude and GPS readouts, a rotating showcase of
  ThrustMIT achievements, and a serial monitor for on the spot debugging.
- **Telemetry** — live flight data console: altitude, velocity, and
  acceleration charts, a GPS map with a live marker and flight path trail,
  csv download of the full session.
- **Motor Test** — ground test console with a safe/armed/burn/complete
  state machine, a press and hold safety interlock on launch, declarative
  channel thresholds (pressure, thrust, casing temperature), csv download.
- **Filters** — upload a csv, auto detects the timestamp and accelerometer
  like columns by header name, lets you pick any column and compare it
  raw against a moving average filter with an adjustable window.

Every hardware mode has a **connect** button (Web Serial, Chrome or Edge
on desktop only) and a **simulate** button for realistic fake data.

## Where things go

- `public/models/` — the 3D rocket model. Swap `placeholder-rocket.obj`
  for your real file keeping the same name, or add a new file and change
  the default `objUrl` in `components/RocketModel.tsx`.
- `public/videos/` — drop `.mp4` clips here, then list the filenames in
  `lib/config/videos.ts`. The carousel plays through all of them on loop
  and sizes to fill its container automatically, any resolution works.
- `lib/config/achievements.ts` — edit this list with real ThrustMIT
  results, the display page rotates through them automatically.

## Colour palette

`tailwind.config.ts` under `theme.extend.colors.console`:
`#F4F4F4` text, `#B3B3B3` muted/border, `#171717` background/panel,
`#08548A` accent, `#D84A1B` warn, `#FF3B21` critical, `#24787A` safe,
`#A36340` armed. Every component uses these semantic tokens, so a
palette change only touches this one file.

## Stack

Next.js 14 (static export), TypeScript, Tailwind, uPlot for charts,
react-three-fiber for the 3D model, maplibre-gl + react-map-gl for the
GPS map, Web Serial API for hardware — no backend, hosted as a static
site.

## Local setup

```
npm install
npm run dev
```

## Deploying to GitHub Pages

```
npm run build
```

Outputs a static site to `/out`. Point GitHub Pages at that folder, or
push it to a `gh-pages` branch.

## Serial packet formats

- **Display**: `roll,pitch,yaw,altitude,lat,lon`
- **Telemetry**: `altitude,velocity,acceleration,lat,lon`
- **Motor**: `pressure,thrust,temp`

All comma separated, one line per sample, newline terminated. The
serial monitor on the Display page shows raw incoming lines if a
device isn't parsing as expected.

## Still open

Not in this pass, flagged rather than dropped: named session history
across reloads, a shared settings drawer (baud rate, units, theme),
keyboard shortcuts, and per chart PNG export.
