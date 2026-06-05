import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f8fafc",
        line: "#d7dde8",
        accent: "#0f766e",
        signal: "#b45309",
      },
    },
  },
  plugins: [],
};

export default config;
