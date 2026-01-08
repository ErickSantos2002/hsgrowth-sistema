import React, { createContext, useState, useEffect, ReactNode } from "react";
import authService from "../services/authService";
import { User } from "../types";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do localStorage na primeira renderização
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = authService.getAccessToken();
      const savedUser = authService.getCurrentUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);

        // Opcional: busca dados atualizados do usuário
        try {
          const updatedUser = await authService.getMe();
          setUser(updatedUser);
        } catch (err) {
          // Se falhar ao buscar dados atualizados, mantém os dados do localStorage
          console.error("Erro ao buscar dados do usuário:", err);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Função de login
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);

      setToken(response.access_token);
      setUser(response.user);
    } catch (err: any) {
      // Tratamento de erros HTTP
      if (err.response) {
        if (err.response.status === 401) {
          setError("Email ou senha incorretos.");
        } else if (err.response.status >= 500) {
          setError("Erro no servidor. Tente novamente mais tarde.");
        } else {
          setError("Erro ao realizar login. Verifique os dados e tente novamente.");
        }
      } else {
        setError("Erro de conexão com o servidor.");
      }

      throw err; // Re-throw para que a página de login possa tratar também
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    } finally {
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
