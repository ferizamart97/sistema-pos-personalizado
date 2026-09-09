/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: '#f3f4f6',
          text: '#1f2937',
          primary: '#3b82f6',
          sidebar: '#1e293b'
        },
        semaphore: {
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
          green: '#22c55e'
        }
      }
    },
  },
  plugins: [],
}
