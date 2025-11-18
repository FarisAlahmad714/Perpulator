/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'trading-dark': '#0f172a',
        'trading-card': '#1e293b',
        'trading-border': '#334155',
        'profit': '#10b981',
        'loss': '#ef4444',
        'neutral': '#6366f1',
      },
    },
  },
  plugins: [],
};
