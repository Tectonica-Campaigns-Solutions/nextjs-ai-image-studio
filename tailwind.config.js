/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Stitch (Kinetic Minimalist) tokens for pixel-like fidelity.
        "stitch-primary": "#005ac2",
        "stitch-primary-dim": "#004fab",
        "stitch-primary-container": "#d8e2ff",
        "stitch-on-primary": "#f7f7ff",
        // Surfaces
        surface: "#faf8ff",
        "on-surface": "#113069",
        "surface-container": "#eaedff",
        "surface-container-low": "#f2f3ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e2e7ff",
        "surface-container-highest": "#d9e2ff",
        "surface-variant": "#d9e2ff",
        "on-surface-variant": "#445d99",
        "surface-dim": "#cdd9ff",
        "surface-tint": "#005ac2",
        "surface-bright": "#faf8ff",
        // Secondary / tertiary / errors
        secondary: "#5e5f65",
        "secondary-container": "#e2e2e9",
        "on-secondary-container": "#505157",
        "secondary-dim": "#515359",
        "secondary-fixed": "#e2e2e9",
        "secondary-fixed-dim": "#d4d4db",
        "on-secondary-fixed": "#3e3f45",
        tertiary: "#5f5c78",
        "tertiary-container": "#d3ceef",
        "on-tertiary-container": "#47445f",
        "tertiary-dim": "#53506b",
        "tertiary-fixed": "#d3ceef",
        "tertiary-fixed-dim": "#c5c0e0",
        "on-tertiary-fixed": "#34314b",
        error: "#9f403d",
        "error-container": "#fe8983",
        "on-error": "#fff7f6",
        "on-error-container": "#752121",
        // Outline (inputs/focus)
        outline: "#6079b7",
        "outline-variant": "#98b1f2",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
