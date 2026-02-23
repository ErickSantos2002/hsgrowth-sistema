/** @type {import('tailwindcss').Config} */
export default {
  // Ativa o modo escuro via classe CSS na tag <html>
  // Quando a classe "dark" está presente no <html>, os prefixos dark: são aplicados
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores de marca (brand)
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',  // Emerald-500 atual
          600: '#059669',  // Emerald-600 atual (botão primário)
          700: '#047857',
        },
        // Cores de superfície (backgrounds)
        surface: {
          base: '#0f172a',      // Slate-900
          elevated: '#1e293b',  // Slate-800
          hover: '#334155',     // Slate-700
        },
        // Cores de texto
        content: {
          primary: '#ffffff',   // Texto principal
          secondary: '#cbd5e1', // Slate-300
          tertiary: '#94a3b8',  // Slate-400
          disabled: '#64748b',  // Slate-500
        },
        // Cores de borda
        border: {
          DEFAULT: '#334155',   // Slate-700
          light: '#475569',     // Slate-600
          focus: '#10b981',     // Emerald-500
        },
        // Cores semânticas de status
        status: {
          success: {
            bg: 'rgba(16, 185, 129, 0.1)',
            text: '#34d399',
            border: '#10b981',
          },
          error: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#f87171',
            border: '#ef4444',
          },
          warning: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#fbbf24',
            border: '#f59e0b',
          },
          info: {
            bg: 'rgba(59, 130, 246, 0.1)',
            text: '#60a5fa',
            border: '#3b82f6',
          },
        },
        // Cores de boards (para customização)
        board: {
          blue: '#3B82F6',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          purple: '#8B5CF6',
          pink: '#EC4899',
          gray: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};
