import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        console: {
          bg: "#0a0d10",
          panel: "#12171c",
          border: "#1f2830",
          text: "#e6edf3",
          muted: "#7d8b96",
          accent: "#4fc3f7",
          warn: "#e8a040",
          critical: "#ef5350",
          safe: "#4caf50",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
