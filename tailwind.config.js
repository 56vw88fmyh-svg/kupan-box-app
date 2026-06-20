/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kupan: {
          black: withAlpha('--color-bg-primary'),
          charcoal: withAlpha('--color-bg-secondary'),
          iron: withAlpha('--color-bg-card'),
          gray: withAlpha('--color-bg-elevated'),
          bone: withAlpha('--color-text-primary'),
          muted: withAlpha('--color-text-muted'),
          ember: withAlpha('--color-brand-red'),
          flame: withAlpha('--color-brand-red-hover'),
          red: withAlpha('--color-error'),
          success: withAlpha('--color-success'),
          warning: withAlpha('--color-warning'),
          info: withAlpha('--color-info'),
          border: withAlpha('--color-border-default'),
        },
      },
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.375rem',
      },
      boxShadow: {
        glow: '0 0 28px rgb(var(--color-brand-red) / 0.26)',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
