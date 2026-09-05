"use client";

import { useMemo } from "react";

// drifting ember dots during boost and coast, page level ambient
// touch rather than inside the 3d scene
export const EmberParticles = ({ active }: { active: boolean }) => {
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 2.5 + Math.random() * 2,
        size: 2 + Math.random() * 3,
      })),
    []
  );

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {embers.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            background: i % 2 === 0 ? "#FC3D21" : "#D1480F",
            animation: `ember-rise ${e.duration}s ease-out ${e.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};
