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

    // Atualiza o access token
    if (response.data.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
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
   * Solicita recuperação de senha (envia email)
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/api/v1/auth/forgot-password", {
      email,
    });

    return response.data;
  }

  /**
   * Reseta a senha usando o token recebido por email
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/api/v1/auth/reset-password", {
      token,
      new_password: newPassword,
    });

    return response.data;
  }

  /**
   * Troca a senha do usuário logado
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    // Pega o ID do usuário logado
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("Usuário não está logado");
    }

    const user: User = JSON.parse(userStr);

    const response = await api.post<{ message: string }>(
      `/api/v1/users/${user.id}/change-password`,
      {
        old_password: oldPassword,
        new_password: newPassword,
      }
    );

    return response.data;
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
