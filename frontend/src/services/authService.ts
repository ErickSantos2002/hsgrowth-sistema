import api from "./api";
import { LoginRequest, LoginResponse, RefreshTokenRequest, User } from "../types";

/**
 * Serviço de autenticação
 * Gerencia login, logout, refresh token e recuperação de senha
 */
class AuthService {
  /**
   * Faz login do usuário
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const payload: LoginRequest = { email, password };

    const response = await api.post<LoginResponse>("/api/v1/auth/login", payload);

    // Salva tokens e dados do usuário no localStorage
    if (response.data.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    try {
      await api.post("/api/v1/auth/logout");
    } catch (error) {
      // Mesmo se der erro no backend, limpa os dados locais
      console.error("Erro ao fazer logout:", error);
    } finally {
      // Limpa todos os dados do localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  }

  /**
   * Renova o access token usando o refresh token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const payload: RefreshTokenRequest = { refresh_token: refreshToken };

    const response = await api.post<LoginResponse>("/api/v1/auth/refresh", payload);

    // Atualiza os tokens — salva tanto access quanto refresh (token rotation)
    if (response.data.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem("refresh_token", response.data.refresh_token);
      }
    }

    return response.data;
  }

  /**
   * Busca os dados do usuário logado
   */
  async getMe(): Promise<User> {
    const response = await api.get<User>("/api/v1/users/me");

    // Atualiza os dados do usuário no localStorage
    localStorage.setItem("user", JSON.stringify(response.data));

    return response.data;
  }

  /**
   * Confere um token de convite/redefinição de senha (rota pública)
   */
  async conferirToken(token: string) {
    return (
      await api.get<{ valido: boolean; kind?: "convite" | "redefinir"; nome?: string; email?: string }>(
        `/api/v1/auth/token/${encodeURIComponent(token)}`
      )
    ).data;
  }

  /**
   * Define a senha a partir do link recebido por e-mail (convite ou redefinição)
   */
  async definirSenha(token: string, novaSenha: string): Promise<void> {
    await api.post("/api/v1/auth/definir-senha", { token, nova_senha: novaSenha });
  }

  /**
   * Pede o link de redefinição de senha (a resposta é sempre a mesma)
   */
  async esqueciSenha(email: string): Promise<void> {
    await api.post("/api/v1/auth/forgot-password", { email });
  }

  /**
   * Troca a senha de quem está logado. O backend revoga todos os tokens
   * emitidos antes da troca e devolve um par novo: guardar antes de qualquer
   * outra chamada, senão a sessão cai.
   */
  async trocarSenha(senhaAtual: string, novaSenha: string): Promise<User> {
    const response = await api.post<{ message: string; access_token: string; refresh_token: string }>(
      "/api/v1/users/me/change-password",
      { current_password: senhaAtual, new_password: novaSenha }
    );
    localStorage.setItem("access_token", response.data.access_token);
    localStorage.setItem("refresh_token", response.data.refresh_token);
    return this.getMe();
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  }

  /**
   * Retorna o usuário logado do localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Atualiza os dados do usuário no localStorage
   */
  setCurrentUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Busca o histórico de logins do usuário autenticado
   */
  async getLoginHistory(limit: number = 20): Promise<{
    total: number;
    logins: Array<{
      id: number;
      user_name: string;
      user_email: string;
      ip_address: string;
      user_agent: string;
      created_at: string;
    }>;
  }> {
    const response = await api.get<{
      total: number;
      logins: Array<{
        id: number;
        user_name: string;
        user_email: string;
        ip_address: string;
        user_agent: string;
        created_at: string;
      }>;
    }>(`/api/v1/auth/login-history?limit=${limit}`);

    return response.data;
  }

  /**
   * Retorna o access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  }

  /**
   * Retorna o refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }
}

// Exporta uma instância única do serviço
export default new AuthService();
