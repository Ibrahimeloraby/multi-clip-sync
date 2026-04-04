/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        apex: {
          bg: "#080c14",
          surface: "#0d1520",
          border: "#1a2740",
          muted: "#1e2d45",
          accent: "#00d4ff",
          green: "#00e676",
          red: "#ff3d57",
          yellow: "#ffd740",
          text: "#e2eaf5",
          subtext: "#6b82a0",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        pulse_slow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [],
};
