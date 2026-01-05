/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 🔥 habilita suporte ao modo escuro baseado em classe
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-white",
    "bg-red-500",
    "bg-blue-500",
    "dark:bg-darkGray",
    "dark:text-lightGray",
    "dark:hover:bg-accentGray",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb", // azul principal (mantido)
        },

        // 🎨 Paleta de tons de cinza para o modo escuro
        darkGray: "#121212",    // fundo principal (substitui o darkBlue)
        mediumGray: "#2a2a2a",  // painéis / cards
        lightGray: "#d1d1d1",   // texto claro
        accentGray: "#3a3a3a",  // bordas, hover, divisores
      },

      keyframes: {
        blinkLight: {
          "0%, 100%": { color: "#000000" }, // preto
          "50%": { color: "#dc2626" }, // vermelho
        },
        blinkDark: {
          "0%, 100%": { color: "#ffffff" }, // branco
          "50%": { color: "#dc2626" }, // vermelho
        },
      },

      animation: {
        blinkLight: "blinkLight 1s infinite",
        blinkDark: "blinkDark 1s infinite",
      },
    },
  },
  plugins: [],
};
