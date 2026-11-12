/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0b1d3a", 800: "#0f2548", 700: "#16325f" },
        brand: "#1d5fe0",
      },
    },
  },
  plugins: [],
};