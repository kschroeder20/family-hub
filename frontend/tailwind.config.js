/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'january': "url('/backgrounds/january.jpg')",
        'february': "url('/backgrounds/february.jpg')",
        'march': "url('/backgrounds/march.jpg')",
        'april': "url('/backgrounds/april.jpg')",
        'may': "url('/backgrounds/may.jpg')",
        'june': "url('/backgrounds/june.jpg')",
        'july': "url('/backgrounds/july.jpg')",
        'august': "url('/backgrounds/august.jpg')",
        'september': "url('/backgrounds/september.jpg')",
        'october': "url('/backgrounds/october.jpg')",
        'november': "url('/backgrounds/november.jpg')",
        'december': "url('/backgrounds/december.jpg')",
      },
    },
  },
  plugins: [],
}
