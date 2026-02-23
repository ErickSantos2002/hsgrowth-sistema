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
  setDarkModeOnLogin: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Estado inicial com persistência no localStorage.
  // Padrão é dark (true) caso o usuário nunca tenha escolhido um tema.
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    // Se não há preferência salva, usa dark como padrão do sistema
    return savedTheme !== 'light';
  });

  // Sincroniza a classe "dark" no <html> e persiste no localStorage
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

  // Alterna entre modo claro e escuro (botão de toggle)
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Ativa o modo escuro automaticamente ao fazer login
  const setDarkModeOnLogin = () => setDarkMode(true);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkModeOnLogin }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
};
