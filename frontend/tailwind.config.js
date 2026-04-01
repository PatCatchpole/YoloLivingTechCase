/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        yolo: {
          rose: "#ec4899",
          rosedark: "#db2777",
          blue: "#2563eb",
          bluedark: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
