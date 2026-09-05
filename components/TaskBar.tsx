"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Maximize2, Minimize2 } from "lucide-react";

const THEME_KEY = "tmit-theme";

// always visible top strip on every page, holds the light and dark
// toggle and a real fullscreen toggle for the whole app, distinct
// from the per panel enlarge used inside display mode
export const TaskBar = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.classList.contains("light") ? "light" : "dark";
    setTheme(stored);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    localStorage.setItem(THEME_KEY, next);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="sticky top-0 z-50 h-9 flex items-center justify-between px-4 bg-console-bg border-b border-console-border/15">
      <span className="text-console-muted text-[11px] tracking-[0.15em]">
        thrustMIT
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="text-console-muted hover:text-console-text transition-colors"
          aria-label="toggle light and dark mode"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="text-console-muted hover:text-console-text transition-colors"
          aria-label="toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );
};
