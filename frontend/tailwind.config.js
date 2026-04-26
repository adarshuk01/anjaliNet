/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8eef7',
          100: '#c5d4e9',
          200: '#9fb8d9',
          300: '#789bc9',
          400: '#5a85be',
          500: '#3c70b3',
          600: '#2d5a9e',
          700: '#1e4585',
          800: '#1A3C6E',
          900: '#112848',
        },
        accent: '#00B4D8',
      },
      fontFamily: {
        mono: ['DM Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
