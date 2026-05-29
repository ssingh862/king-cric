/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cricket: {
          bg: '#0A0612',
          card: 'rgba(255,255,255,0.06)',
          border: 'rgba(255,255,255,0.12)',
          orange: '#FF6B00',
          gold: '#FFD700',
          purple: '#7B2CBF',
          pink: '#E91E8C',
          green: '#00C853',
          blue: '#00B4D8',
        },
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};
