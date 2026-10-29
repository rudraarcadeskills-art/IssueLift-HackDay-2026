import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Midnight Ink theme palette
        midnight: {
          950: "#060A14", // Deepest background
          900: "#0B1020", // Default canvas dark
          850: "#0F162A", // Secondary canvas dark
          800: "#121A2B", // Elevated surface dark
          750: "#162035", // Hover surface
          700: "#1E2A44", // Deep border
          600: "#2B3C5E", // Border accent
        },
        violet: {
          500: "#8B5CF6", // Electric violet
          600: "#7C3AED",
          400: "#A78BFA",
          950: "#1E113B",
        },
        sky: {
          500: "#3B82F6",
          400: "#60A5FA", // Bright blue
        },
        teal: {
          400: "#2DD4BF", // Evidence teal
          500: "#14B8A6",
          950: "#042F2E",
        },
        coral: {
          400: "#FB7185", // Warning coral
          500: "#F43F5E",
          950: "#4C0519",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          950: "#451A03",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(139, 92, 246, 0.25)",
        "glow-teal": "0 0 25px -5px rgba(45, 212, 191, 0.25)",
        "card-dark": "0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config;
