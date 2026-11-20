/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#070d19',
          surface: '#0d1829',
          card: '#132238',
          cardHover: '#182b46',
          border: '#1f3556',
          borderLight: '#2b4772',
          accent: '#2563eb',
          accentHover: '#1d4ed8',
          textMuted: '#94a3b8',
          textLight: '#f1f5f9'
        }
      }
    },
  },
  plugins: [],
}
