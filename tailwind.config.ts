import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          light: "#eef2ff",
          mid: "#c7d2fe",
        },
        page: "#f5f7ff",
        surface: "#f8f9ff",
        border: {
          DEFAULT: "#e8eaf6",
          strong: "#d1d5f0",
        },
        tx: {
          primary: "#1a1d3a",
          secondary: "#5b5e7e",
          muted: "#9396b5",
        },
        background: "var(--bg-page)",
        foreground: "var(--text-primary)",
        muted: {
          DEFAULT: "var(--text-secondary)",
          foreground: "var(--text-muted)",
        },
        primary: "var(--brand)",
        accent: "var(--brand)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "7px",
        xs: "5px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft:
          "0 1px 3px rgba(99,102,241,0.08), 0 1px 2px rgba(99,102,241,0.04)",
        md: "0 4px 16px rgba(99,102,241,0.12)",
        drawer: "-4px 0 20px rgba(99,102,241,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
