"use client";

type CompassRoseProps = {
  headingDeg: number;
};

// simple compass driven by raw magnetometer heading, rotates live as
// the board turns, no tilt compensation, matches the scope of the
// magnetometer readout elsewhere in display mode
export const CompassRose = ({ headingDeg }: CompassRoseProps) => (
  <div className="relative h-14 w-14 shrink-0">
    <svg viewBox="0 0 60 60" className="h-14 w-14">
      <circle cx="30" cy="30" r="26" fill="none" stroke="#B6B6B6" strokeOpacity="0.2" strokeWidth="2" />
      <g style={{ transform: `rotate(${-headingDeg}deg)`, transformOrigin: "30px 30px" }}>
        <polygon points="30,8 25,30 30,26 35,30" fill="#FC3D21" />
        <polygon points="30,52 25,30 30,34 35,30" fill="#B6B6B6" />
      </g>
    </svg>
    <div className="absolute inset-x-0 -bottom-1 text-center">
      <span className="text-[9px] font-mono text-console-muted">{Math.round(headingDeg)}°</span>
    </div>
  </div>
);
