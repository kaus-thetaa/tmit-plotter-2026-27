"use client";

// grainy gradient loading state, matches the warm to dark teal mood
// reference, used as suspense fallback for anything fetching an asset
export const LoadingGrain = ({ label = "loading" }: { label?: string }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-console-gunmetal">
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 30% 35%, #FC3D21 0%, #D1480F 18%, #A2673F 38%, #1D7373 62%, #242528 85%)",
        opacity: 0.55,
        filter: "blur(2px)",
      }}
    />
    <svg className="absolute inset-0 w-full h-full opacity-[0.15] mix-blend-overlay">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
    <p className="relative z-10 text-console-text/80 text-xs tracking-[0.2em] uppercase animate-pulse">
      {label}
    </p>
  </div>
);
