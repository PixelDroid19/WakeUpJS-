/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a1a1a',
        },
      },
      animation: {
        'scaleIn': 'scaleIn 0.15s ease-out forwards',
      },
      keyframes: {
        scaleIn: {
          'from': { transform: 'scale(0.95)', opacity: 0 },
          'to': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
