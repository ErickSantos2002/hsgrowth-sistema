'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useTheme } from '../context/ThemeContext';

const Login: React.FC = () => {
  const { login, loading, error, user } = useAuth();
  const { setDarkModeOnLogin } = useTheme(); // 👈 use a nova função
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      // ✅ Ativa via contexto (não manualmente)
      setDarkModeOnLogin();

      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, location.pathname, setDarkModeOnLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center dark bg-darkGray">
      {/* Card vidro fosco */}
      <div
        className="relative w-full max-w-[360px] bg-white/10 backdrop-blur-md border border-white/20 
                      rounded-[20px] px-8 pt-14 pb-8 text-center 
                      shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        {/* Ícone de usuário no topo */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
          <div
            className="w-20 h-20 rounded-full bg-[#2d2e2e] flex items-center justify-center 
                          shadow-lg border-2 border-white/30"
          >
            <img
              src="https://img.icons8.com/?size=100&id=84020&format=png&color=ffffff"
              alt="Usuário"
              className="w-10 h-10"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="max-h-[60px] object-contain" />
        </div>

        {/* Título */}
        <h1 className="text-[22px] font-bold text-white mb-1">Bem-vindo</h1>
        <p className="text-gray-300 text-sm mb-6">Faça login para continuar</p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            id="username"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Usuário"
            className="w-full h-[48px] px-4 rounded-lg bg-white/20 text-white placeholder-gray-300 
                       focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:opacity-50"
            required
          />

          <input
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Senha"
            className="w-full h-[48px] px-4 rounded-lg bg-white/20 text-white placeholder-gray-300 
                       focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:opacity-50"
            required
          />

          {error && (
            <div className="text-sm text-red-400 text-center bg-red-900/40 p-2 rounded-lg border border-red-500/40">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 
                       text-white font-semibold text-[16px] rounded-lg transition flex items-center 
                       justify-center shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Entrando...
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
