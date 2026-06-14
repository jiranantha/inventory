import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/constants/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#f5f7fa",
        panel: "#ffffff",
        panelSoft: "#f8fafc",
        gold: "#1e40af",
        amberSoft: "#1d4ed8",
        orange: "#1e40af",
        surface: "#ffffff",
        surfaceSoft: "#f8fafc",
        line: "#e2e8f0",
        ink: "#0f172a",
        muted: "#64748b",
        primary: {
          DEFAULT: "#1e40af",
          hover: "#1d4ed8",
        },
      },
      fontFamily: {
        thai: ["var(--font-thai)", "Prompt", "Sarabun", "Noto Sans Thai", "sans-serif"],
      },
      boxShadow: {
        glow: "0 8px 24px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
