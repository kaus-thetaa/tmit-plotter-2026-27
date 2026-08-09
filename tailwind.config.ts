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
          bg: "#171717",
          panel: "#171717",
          border: "#B3B3B3",
          text: "#F4F4F4",
          muted: "#B3B3B3",
          accent: "#08548A",
          warn: "#D84A1B",
          critical: "#FF3B21",
          safe: "#24787A",
          armed: "#A36340",
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
