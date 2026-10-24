import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
          light: "#eef2ff",
          mid: "#c7d2fe",
        },
        page: "#f8fafc",
        surface: "#ffffff",
        border: {
          DEFAULT: "#e2e8f0",
          strong: "#cbd5e1",
        },
        tx: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#64748b",
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
        DEFAULT: "8px",
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.07)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        modal: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
