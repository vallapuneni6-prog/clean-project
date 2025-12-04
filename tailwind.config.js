/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7C3DB5',
          gradient: {
            from: '#7C3DB5',
            to: '#9B5FD8',
          },
          background: '#F8F7F3',
          surface: '#FFFFFF',
          border: '#E8E3D8',
          'text-primary': '#4A2A5C',
          'text-secondary': '#6B6B6B',
        }
      }
    },
  },
  plugins: [],
}
