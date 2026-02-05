/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sunny: {
          50: '#fffef5',
          100: '#fffacc',
          200: '#fff4a3',
          300: '#ffe066',
          400: '#ffcc33',
          500: '#ffb800',
          600: '#e6a600',
          700: '#cc9400',
          800: '#b38200',
          900: '#997000',
        },
        'playful-blue': '#4dabf7',
        'playful-pink': '#ff6b9d',
        'playful-purple': '#9775fa',
        'playful-green': '#51cf66',
        'playful-orange': '#ff922b',
        'chun-tier1': '#ff922b',
        'chun-tier2': '#868e96',
        'chun-tier3': '#ffd43b',
      },
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Baloo 2', 'Nunito', 'ui-rounded', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        bubble: '3rem',
      },
      borderWidth: {
        '8': '8px',
      },
      animation: {
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};
