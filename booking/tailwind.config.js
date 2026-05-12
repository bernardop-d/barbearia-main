export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0c0c0c',
          800: '#111111',
          700: '#1e1e1e',
          600: '#2a2a2a',
          500: '#555',
          400: '#888',
          300: '#aaa',
        },
        blade: {
          400: '#00e87a',
          500: '#00e87a',
          600: '#00c469',
        },
        gold: { 400: '#fbbf24' }
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
}
