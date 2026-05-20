/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kupan: {
          black: '#000000',
          charcoal: '#111111',
          iron: '#2A2A2A',
          bone: '#FFFFFF',
          ember: '#FF5A1F',
          flame: '#C1121F',
        },
      },
      boxShadow: {
        glow: '0 0 28px rgba(255, 90, 31, 0.26)',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
