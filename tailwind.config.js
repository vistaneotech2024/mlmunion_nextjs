/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        shine: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' }
        },
        arrowSlide: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(4px)' }
        },
        scrollLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        shine: 'shine 3s infinite',
        'arrow-slide': 'arrowSlide 1s ease-in-out infinite',
        'scroll-left': 'scrollLeft 30s linear infinite',
        'scroll-left-reverse': 'scrollLeft 35s linear infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')({
      className: 'wysiwyg'
    }),
  ],
};

