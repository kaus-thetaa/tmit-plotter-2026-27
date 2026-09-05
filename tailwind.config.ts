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
          bg: "rgb(var(--c-bg) / <alpha-value>)",
          panel: "rgb(var(--c-panel) / <alpha-value>)",
          border: "rgb(var(--c-border) / <alpha-value>)",
          text: "rgb(var(--c-text) / <alpha-value>)",
          muted: "rgb(var(--c-muted) / <alpha-value>)",
          accent: "#005288",
          warn: "#D1480F",
          critical: "#FC3D21",
          safe: "#1D7373",
          armed: "#A2673F",
          gunmetal: "#242528",
          dumpling: "#9E3120",
          silver: "#D5C4BB",
          cadet: "#98A6A9",
          slate2: "#798F9C",
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
