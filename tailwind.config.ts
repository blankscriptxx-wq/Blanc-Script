import type { Config } from "tailwindcss";

/**
 * Blanc Script brand tokens.
 * Palette sourced from the official brand board:
 *   cream #F1E7DE · teal #40B6BA · gold #EFA93A · coral #E8375B · charcoal #343D3A
 * Light-led editorial: cream/white is the canvas, charcoal is the punctuation,
 * coral is the primary action colour, teal the secondary accent, gold a rare highlight.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F1E7DE",
        "cream-deep": "#E7DACE",
        teal: {
          DEFAULT: "#40B6BA",
          dark: "#2E8E92",
        },
        gold: {
          DEFAULT: "#EFA93A",
          dark: "#D8912A",
        },
        coral: {
          DEFAULT: "#E8375B",
          dark: "#C82848",
        },
        charcoal: {
          DEFAULT: "#343D3A",
          deep: "#22292A",
          soft: "#4A5450",
        },
        ink: "#1B201F",
      },
      fontFamily: {
        // Bound to next/font CSS variables set in app/layout.tsx
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        // Fluid, responsive display scale (clamp: mobile-first floor → desktop ceiling)
        "display-sm": ["clamp(2.25rem, 7vw, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2.75rem, 9vw, 5rem)", { lineHeight: "0.98", letterSpacing: "-0.025em" }],
        "display-lg": ["clamp(3.25rem, 12vw, 8rem)", { lineHeight: "0.92", letterSpacing: "-0.03em" }],
        "display-xl": ["clamp(3.75rem, 15vw, 11rem)", { lineHeight: "0.9", letterSpacing: "-0.035em" }],
      },
      maxWidth: {
        content: "80rem",
      },
      spacing: {
        section: "clamp(4rem, 10vw, 9rem)",
      },
      borderRadius: {
        card: "1.25rem",
        pill: "999px",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(1rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
