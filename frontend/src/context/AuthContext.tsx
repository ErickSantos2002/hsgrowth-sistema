import React, { createContext, useState, useEffect, ReactNode } from 'react';

type AuthContextType = {
  user: { id: number; username: string; role: string } | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{
    id: number;
    username: string;
    role: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do localStorage na primeira renderização
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedId = localStorage.getItem('id');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('role');

    if (savedToken && savedId && savedUsername && savedRole) {
      setUser({
        id: Number(savedId),
        username: savedUsername,
        role: savedRole,
      });
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  // Função de login
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Agora usa a função do controlapi que já salva o token
      const { access_token } = loginData;

      setToken(access_token);

      // ✅ Busca dados do usuário logado (o token já está configurado)
      const me = await getMe();

      const { id, username: userNameFromAPI, role, setor_id } = me; // 🆕 pega setor_id
      const roleName = typeof role === 'string' ? role : role?.name || '';

      // salva no localStorage
      localStorage.setItem('id', id.toString());
      localStorage.setItem('username', userNameFromAPI);
      localStorage.setItem('role', roleName);
      localStorage.setItem('setor_id', setor_id?.toString() || ''); // 🆕 ADICIONAR ESTA LINHA

      // atualiza state
      setUser({ id, username: userNameFromAPI, role: roleName });
    } catch (err: any) {
      // 🧠 Aqui tratamos os erros HTTP
      if (err.response) {
        if (err.response.status === 401) {
          setError('Usuário ou senha incorretos.');
        } else if (err.response.status >= 500) {
          setError('Erro no servidor. Tente novamente mais tarde.');
        } else {
          setError(
            'Erro ao realizar login. Verifique os dados e tente novamente.',
          );
        }
      } else {
        setError('Erro de conexão com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('id');
    localStorage.removeItem('setor_id'); // 🆕 ADICIONAR ESTA LINHA
    setUser(null);
    setToken(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
