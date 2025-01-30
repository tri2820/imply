/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      transitionProperty: {
        'width': 'width'
      },
      animation: {
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-in-out'
      },
      keyframes: {
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.animate-paused': {
          'animation-play-state': 'paused!important',
        },
      }, ['responsive', 'hover']);
    },
    require('@tailwindcss/typography'),
  ]
};

