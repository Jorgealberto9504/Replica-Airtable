// apps/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};