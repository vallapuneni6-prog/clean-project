/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-background': '#0a0e27',
        'brand-surface': '#111729',
        'brand-border': '#1e293b',
        'brand-text-primary': '#f1f5f9',
        'brand-text-secondary': '#cbd5e1',
        'brand-primary': '#6366f1',
        'brand-gradient-from': '#6366f1',
        'brand-gradient-to': '#8b5cf6',
      },
    },
  },
  plugins: [],
}
