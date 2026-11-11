import type { Config } from "tailwindcss";

/**
 * Blanc Script OS Tailwind config.
 * Colours bind to the `--bs-*` semantic variables (see app/globals.css) under a
 * `bs` namespace, so `bg-bs-surface`, `text-bs-muted`, `border-bs-border` etc.
 * This is the OS token layer — intentionally separate from the marketing site.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bs: {
          canvas: "var(--bs-canvas)",
          surface: "var(--bs-surface)",
          "surface-2": "var(--bs-surface-2)",
          overlay: "var(--bs-overlay)",
          cream: "var(--bs-cream)",
          text: "var(--bs-text)",
          muted: "var(--bs-text-muted)",
          subtle: "var(--bs-text-subtle)",
          "on-accent": "var(--bs-text-on-accent)",
          border: "var(--bs-border)",
          "border-strong": "var(--bs-border-strong)",
          ring: "var(--bs-ring)",
          primary: "var(--bs-primary)",
          "primary-hover": "var(--bs-primary-hover)",
          "primary-soft": "var(--bs-primary-soft)",
          accent: "var(--bs-accent)",
          "accent-soft": "var(--bs-accent-soft)",
          success: "var(--bs-success)",
          "success-soft": "var(--bs-success-soft)",
          warning: "var(--bs-warning)",
          "warning-soft": "var(--bs-warning-soft)",
          danger: "var(--bs-danger)",
          "danger-soft": "var(--bs-danger-soft)",
          info: "var(--bs-info)",
          "info-soft": "var(--bs-info-soft)",
          neutral: "var(--bs-neutral)",
          "neutral-soft": "var(--bs-neutral-soft)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        display: ["30px", { lineHeight: "36px", fontWeight: "600" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px" }],
        sm: ["13px", { lineHeight: "18px" }],
        xs: ["12px", { lineHeight: "16px" }],
        eyebrow: ["11px", { lineHeight: "14px", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "10px",
        lg: "14px",
        pill: "999px",
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgba(27,32,31,.06)",
        "elev-2": "0 6px 16px -6px rgba(27,32,31,.14)",
        "elev-3": "0 20px 48px -16px rgba(27,32,31,.22)",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
