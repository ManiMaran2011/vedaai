/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: { brand: '#E8650A' },
      keyframes: {
        fadeUp:    { from: { opacity:'0', transform:'translateY(8px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        fadeIn:    { from: { opacity:'0' }, to: { opacity:'1' } },
        slideDown: { from: { opacity:'0', transform:'translateY(-4px)' }, to: { opacity:'1', transform:'translateY(0)' } },
      },
      animation: {
        'fade-up':    'fadeUp 0.2s ease-out both',
        'fade-in':    'fadeIn 0.15s ease-out both',
        'slide-down': 'slideDown 0.15s ease-out both',
      },
    },
  },
  plugins: [],
};
