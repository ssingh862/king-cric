/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cricket: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          orange: '#EA580C',
          gold: '#B45309',
          purple: '#7C3AED',
          pink: '#DB2777',
          green: '#059669',
          blue: '#0284C7',
        },
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};
