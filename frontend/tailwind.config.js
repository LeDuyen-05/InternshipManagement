/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        portal: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
