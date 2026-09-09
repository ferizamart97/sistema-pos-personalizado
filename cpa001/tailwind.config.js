/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'semaphore-red': '#EF4444',
        'semaphore-orange': '#F97316',
        'semaphore-yellow': '#EAB308',
        'semaphore-green': '#22C55E',
        'primary': '#2563EB',
        'primary-dark': '#1D4ED8',
      },
    },
  },
  plugins: [],
};
