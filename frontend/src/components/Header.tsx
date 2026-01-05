import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/HS2.ico';
import ModalTrocarSenha from '../components/ModalTrocarSenha';


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation(); // ✅ Antes de usar
  const { darkMode, toggleDarkMode } = useTheme();

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [menuAnimado, setMenuAnimado] = useState(false);
  const [modalSenhaAberta, setModalSenhaAberta] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  if (location.pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const abrirMenu = () => {
    setMenuVisivel(true);
    setTimeout(() => setMenuAnimado(true), 10);
  };

  const fecharMenu = () => {
    setMenuAnimado(false);
    setTimeout(() => setMenuVisivel(false), 300);
  };

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        fecharMenu();
      }
    };
    if (menuVisivel) {
      document.addEventListener('mousedown', handleClickFora);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('mousedown', handleClickFora);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.body.style.overflow = '';
    };
  }, [menuVisivel]);

  const handleConfirmarSenha = (novaSenha: string) => {
    console.log('Nova senha:', novaSenha);
    // 🔹 Aqui você pode adicionar a lógica para atualizar a senha via API
  };

  const iconBaseClass = 'w-5 h-5 mr-2 transition-colors';

  const getColor = (isActive: boolean, darkMode: boolean) => {
    if (darkMode) {
      return 'D1D1D1'; // ícones claros no modo escuro
    }
    return isActive ? '1E3A8A' : '1D4ED8'; // azul escuro / azul vivo
  };

  const mobileMenuItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: (active: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=udjU_YS4lMXL&format=png&color=${getColor(active, darkMode)}`}
          className={iconBaseClass}
          alt="Dashboard"
        />
      ),
    },
    {
      label: 'Exemplo',
      to: '/Exemplo',
      icon: (active: boolean) => (
        <img
          src="https://img.icons8.com/?size=100&id=f6XnJbAyvoWg&format=png"
          className={`${iconBaseClass} ${active ? 'opacity-100' : 'opacity-70'} 
                      dark:filter dark:brightness-0 dark:invert`}
          alt="Exemplo"
        />
      ),
    },
  ];


  return (
    <>
      {/* HEADER FIXO */}
      <header
        className="sticky top-0 inset-x-0 z-50 
        bg-white/95 dark:bg-[#1e1e1e]/95 
        backdrop-blur-sm shadow-md 
        flex items-center justify-between px-4 py-3 
        transition-colors border-b border-gray-200 dark:border-[#2d2d2d]"
      >
        <div className="flex items-center gap-4">
          {/* Botão menu mobile */}
          <button
            onClick={abrirMenu}
            className="block lg:hidden text-gray-700 dark:text-lightGray text-2xl focus:outline-none"
          >
            ☰
          </button>

          {/* Logo + título */}
          <Link
            to="/dashboard"
            className="hidden lg:flex items-center gap-2 font-bold text-xl text-blue-700 dark:text-lightGray hover:scale-105 transition no-underline group"
          >
            <img
              src={logo}
              alt="Logo"
              className="w-6 h-6 transition-transform duration-500 group-hover:rotate-[360deg]"
            />
            <span>GrowthHS</span>
          </Link>
        </div>

        {/* Infos e botão sair */}
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setModalSenhaAberta(true)}
            className="group text-gray-700 dark:text-gray-300 underline underline-offset-4 transition hover:text-blue-600 dark:hover:text-blue-400"
          >
            <span>
              {user?.username}{' '}
              <span className="text-xs text-gray-400 group-hover:text-blue-400 transition">
                ({user?.role})
              </span>
            </span>
          </button>

          {!menuVisivel && (
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* MENU MOBILE */}
      {menuVisivel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={fecharMenu}
          />
          <div
            ref={menuRef}
            className={`fixed inset-y-0 left-0 w-[70vw] bg-white/95 dark:bg-[#1e1e1e] z-50 shadow-lg px-6 pb-6 flex flex-col transform transition-transform duration-300 ${
              menuAnimado ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Cabeçalho do menu */}
            <div className="flex items-center justify-between py-3 mb-3 border-b border-gray-200 dark:border-[#2d2d2d]">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                <span className="font-bold text-lg text-blue-700 dark:text-lightGray">
                  Menu
                </span>
              </div>
              <button
                onClick={fecharMenu}
                className="text-gray-600 dark:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Navegação */}
            <nav className="flex flex-col gap-4">
              {mobileMenuItems.map((item) => {
                const active = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={fecharMenu}
                    className={`flex items-center font-medium transition px-2 py-1 rounded-md
                      ${active
                        ? "text-blue-700 dark:text-blue-400 bg-gray-200 dark:bg-accentGray/40"
                        : "text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                      }
                    `}
                  >
                    {item.icon(active)}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Rodapé do menu mobile */}
            <div className="mt-auto flex flex-col gap-3 border-t border-gray-200 dark:border-[#2d2d2d] pt-4">
              <div className="flex items-center justify-between font-medium text-gray-700 dark:text-gray-200 py-2">
                <div className="flex items-center gap-2">
                  {darkMode ? (
                    <img
                      src="https://img.icons8.com/?size=100&id=s6SybfgfYCLU&format=png&color=FFD700"
                      alt="Modo Claro"
                      className="w-5 h-5"
                    />
                  ) : (
                    <img
                      src="https://img.icons8.com/?size=100&id=11404&format=png&color=1E40AF"
                      alt="Modo Escuro"
                      className="w-5 h-5"
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
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full border transition peer-checked:translate-x-5"></div>
                </label>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left text-red-600 font-medium hover:text-red-800 py-2 rounded-lg transition"
              >
                <img
                  src="https://img.icons8.com/?size=100&id=59781&format=png&color=FF0000"
                  alt="Sair"
                  className="w-5 h-5"
                />
                <span className="ml-2">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🔹 Modal de Trocar Senha */}
      <ModalTrocarSenha
        isOpen={modalSenhaAberta}
        onClose={() => setModalSenhaAberta(false)}
        onConfirm={handleConfirmarSenha}
      />
    </>
  );
};

export default Header;
