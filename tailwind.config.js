/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
          DEFAULT: "#3b82f6", // Blue-500
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f3f4f6", // Gray-100
          foreground: "#111827", // Gray-900
        },
        destructive: {
          DEFAULT: "#ef4444", // Red-500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f9fafb", // Gray-50
          foreground: "#6b7280", // Gray-500
        },
        accent: {
          DEFAULT: "#f3f4f6", // Gray-100
          foreground: "#111827", // Gray-900
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#111827", // Gray-900
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827", // Gray-900
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}