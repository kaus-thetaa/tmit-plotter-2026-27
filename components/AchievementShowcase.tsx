"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/lib/config/achievements";

const ROTATE_MS = 5000;

// auto rotates through the achievements config, one at a time, fading between them
export const AchievementShowcase = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ACHIEVEMENTS.length);
        setVisible(true);
      }, 300);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, []);

  const current = ACHIEVEMENTS[index];

  return (
    <div className="panel p-6 min-h-[140px] flex flex-col justify-center">
      <p className="text-console-accent text-xs tracking-[0.2em] mb-2">
        thrustMIT achievements
      </p>
      <div
        className={`transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-xl font-semibold">{current.title}</p>
        <p className="text-console-muted text-sm mt-1">
          {current.description}
        </p>
        {current.url && (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-console-accent text-xs mt-2 inline-block hover:underline"
          >
            read more &rarr;
          </a>
        )}
      </div>
      <div className="flex gap-1.5 mt-4">
        {ACHIEVEMENTS.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === index
                ? "w-6 bg-console-accent"
                : "w-1.5 bg-console-border/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
