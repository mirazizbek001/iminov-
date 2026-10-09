/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Bitta rang (ko‘k) asosidagi palitra: oq/qora fon yo'q.
        neutral: {
          50: '#2a70d8', 100: '#3a80e4', 200: '#4f92ec', 300: '#6aa5f0',
          400: '#c4dcff', 500: '#d4e6ff', 600: '#e4efff', 700: '#f0f6ff',
          800: '#ffffff', 900: '#ffffff', 950: '#1450a8',
        },
      },
    },
  },
  plugins: [],
}
