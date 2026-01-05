// src/context/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkModeOnLogin: () => void; // 👈 nova função
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // 🔹 Estado inicial com persistência
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // 🔹 Sincroniza com <html> e localStorage sempre que darkMode mudar
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 🔹 Alterna o modo escuro manualmente (botão)
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // 🔹 Ativa o modo escuro automaticamente no login
  const setDarkModeOnLogin = () => setDarkMode(true);

  return (
    <ThemeContext.Provider
      value={{ darkMode, toggleDarkMode, setDarkModeOnLogin }}
    >
      <div
        className={
          darkMode
            ? 'dark bg-darkGray text-lightGray min-h-screen' // 🎨 novo tema cinza
            : 'bg-gray-100 text-black min-h-screen'
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
};
