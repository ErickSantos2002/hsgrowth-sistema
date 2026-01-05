import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (location.pathname === '/login') return null;

  const iconBaseClass = 'w-5 h-5 mr-2 transition-colors';

  const getColor = (isActive: boolean) => {
    if (darkMode) {
      return 'D1D1D1'; // ícones em cinza claro no dark
    }
    return isActive ? '1E3A8A' : '1D4ED8'; // tons de azul no modo claro
  };

  const menuItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=udjU_YS4lMXL&format=png&color=${getColor(isActive)}`}
          alt="Dashboard"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: 'Exemplo',
      to: '/Exemplo',
      icon: (isActive: boolean) => (
        <img
          src="https://img.icons8.com/?size=100&id=f6XnJbAyvoWg&format=png"
          alt="Exemplo"
          className={`${iconBaseClass} ${isActive ? 'opacity-100' : 'opacity-70'} 
                  dark:filter dark:brightness-0 dark:invert transition-all duration-200`}
        />
      ),
    },
  ];

  return (
    <aside
      className="hidden lg:flex w-56 
      bg-white/95 dark:bg-[#1e1e1e]/95 
      text-gray-900 dark:text-lightGray 
      shadow-md sticky top-0 flex-col 
      border-r border-gray-200 dark:border-[#2d2d2d] 
      transition-colors"
    >
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-blue-700 dark:bg-accentGray/50 dark:text-lightGray'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-accentGray/30'
                  }`
                }
                end
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Switch de modo noturno */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-accentGray">
        <div className="flex items-center justify-between font-medium text-gray-800 dark:text-lightGray">
          <div className="flex items-center gap-2">
            {darkMode ? (
              // ☀️ Sol amarelo (modo claro)
              <img
                src="https://img.icons8.com/?size=100&id=s6SybfgfYCLU&format=png&color=FFD700"
                alt="Modo Claro"
                className="w-6 h-6 drop-shadow-md"
              />
            ) : (
              // 🌙 Lua azul (modo escuro)
              <img
                src="https://img.icons8.com/?size=100&id=11404&format=png&color=2563EB"
                alt="Modo Escuro"
                className="w-6 h-6 drop-shadow-md"
              />
            )}
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            {/* Trilha */}
            <div className="w-12 h-7 bg-gray-400 dark:bg-accentGray rounded-full peer-checked:bg-blue-600 transition-all"></div>
            {/* Bolinha */}
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full border shadow-md transition-transform peer-checked:translate-x-5"></div>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
