/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        ink:    { DEFAULT: '#0a0a0a', 50: '#f5f5f5', 100: '#e8e8e8', 200: '#d1d1d1', 300: '#a8a8a8', 400: '#737373', 500: '#525252', 600: '#3d3d3d', 700: '#2a2a2a', 800: '#1a1a1a', 900: '#0a0a0a' },
        blade:  { DEFAULT: '#22c55e', 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
        gold:   { DEFAULT: '#f59e0b', 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#fbbf24', 600: '#d97706' },
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },               to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
