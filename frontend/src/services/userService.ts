import api from "./api";
import {
  User,
  PaginatedResponse,
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
} from "../types";

/**
 * Serviço de usuários
 * Gerencia CRUD de usuários
 */
class UserService {
  /**
   * Lista usuários com paginação e filtros
   */
  async list(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const response = await api.get<PaginatedResponse<User>>("/api/v1/users", {
      params: filters,
    });

    return response.data;
  }

  /**
   * Busca um usuário por ID
   */
  async getById(id: number): Promise<User> {
    const response = await api.get<User>(`/api/v1/users/${id}`);
    return response.data;
  }

  /**
   * Busca o usuário logado
   */
  async getMe(): Promise<User> {
    const response = await api.get<User>("/api/v1/users/me");
    return response.data;
  }

  /**
   * Cria um novo usuário
   */
  async create(data: CreateUserRequest): Promise<User> {
    const response = await api.post<User>("/api/v1/users", data);
    return response.data;
  }

  /**
   * Atualiza um usuário
   */
  async update(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await api.put<User>(`/api/v1/users/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um usuário (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/users/${id}`);
  }

  /**
   * Troca a senha de um usuário
   */
  async changePassword(id: number, data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/api/v1/users/${id}/change-password`,
      data
    );
    return response.data;
  }
}

export default new UserService();
