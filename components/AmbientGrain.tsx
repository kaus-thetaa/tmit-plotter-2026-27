"use client";

// always on, very faint grain and vignette across the whole page,
// a much subtler version of the loading screen's texture
export const AmbientGrain = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, transparent 35%, #1A1A1A 100%)",
        opacity: 0.5,
      }}
    />
    <svg className="absolute inset-0 w-full h-full opacity-[0.05] mix-blend-overlay">
      <filter id="ambient-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ambient-grain)" />
    </svg>
  </div>
);
