# tMIT Plotter 2026-27

ThrustMIT's ground station and telemetry console. Four modes in one app,
a simulated data fallback so every mode works with any combination of
hardware attached, or none at all, and a csv workflow in both directions.

## Modes

- **Display** — booth demo mode. Live accelerometer, gyroscope,
  magnetometer, and GPS readouts with live charts. Accel and gyro feed a
  complementary filter that drives the live 3D rocket model in real time.
  Also has a 3D terrain map, a rotating showcase of ThrustMIT achievements,
  and a serial monitor for on the spot debugging.
- **Telemetry** — full flight data console with a real, algorithmically
  derived flight state (standby/boost/coast/drogue/main/recovery) computed
  from actual barometric pressure and altitude, not scripted. Nine
  modular panel groups (flight, accelerometer, gyroscope, magnetometer,
  environment, GPS with 3D terrain map, radio link, pyro continuity,
  battery), each independently closable and expandable, plus five named
  view presets (Overview, Full Engineering, Recovery Focus, IMU
  Diagnostic, Public Display). CSV download of the full session.
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

Deployment is automated. `.github/workflows/deploy.yml` builds and
publishes the site to GitHub Pages on every push to `main`.

One-time setup on GitHub:
1. Push this repo to GitHub.
2. Go to Settings -> Pages.
3. Under "Build and deployment", set Source to "GitHub Actions".

That's it — push to `main` and the workflow builds and deploys
automatically. Check the Actions tab for progress and the deployed
URL. `next.config.mjs` auto-detects the repo name inside GitHub
Actions so the site works correctly at the `/repo-name/` subpath
GitHub Pages serves project sites from; nothing to configure by hand.

To build locally instead:

```
npm run build
```

Outputs a static site to `/out`.

## Serial packet formats

- **Display**: `ax,ay,az,gx,gy,gz,mx,my,mz,lat,lon` (accel in g, gyro in deg/s, mag in uT)
- **Telemetry**: `altitude,velocity,accel_z,accel_x,accel_y,gyro_x,gyro_y,gyro_z,mag_x,mag_y,mag_z,pressure_hpa,temp_c,gps_alt,sats,fix,rssi,snr,battery_v,drogue_continuity,main_continuity,lat,lon` (23 values)
- **Motor**: `pressure,thrust,temp`

All comma separated, one line per sample, newline terminated. The
serial monitor on the Display page shows raw incoming lines if a
device isn't parsing as expected.

## Still open

Not in this pass, flagged rather than dropped: named session history
across reloads, a shared settings drawer (baud rate, units, theme),
keyboard shortcuts, and per chart PNG export.
