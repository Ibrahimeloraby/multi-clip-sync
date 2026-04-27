import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f14',
          card: '#16161f',
          raised: '#1e1e2a',
          border: '#2a2a3a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(124,58,237,0.35)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      screens: {
        tv: '1920px',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s linear infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0)' }, '50%': { boxShadow: '0 0 32px 4px rgba(124,58,237,0.4)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
} satisfies Config
