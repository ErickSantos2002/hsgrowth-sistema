import api from "./api";
import {
  Client,
  PaginatedResponse,
  PaginationParams,
  CreateClientRequest,
  UpdateClientRequest,
} from "../types";

/**
 * Serviço de clientes
 * Gerencia CRUD de clientes
 */
class ClientService {
  /**
   * Lista clientes com paginação e filtros
   */
  async list(filters?: PaginationParams & { search?: string }): Promise<PaginatedResponse<Client>> {
    const response = await api.get<PaginatedResponse<Client>>("/api/v1/clients", {
      params: filters,
    });

    return response.data;
  }

  /**
   * Busca um cliente por ID
   */
  async getById(id: number): Promise<Client> {
    const response = await api.get<Client>(`/api/v1/clients/${id}`);
    return response.data;
  }

  /**
   * Cria um novo cliente
   */
  async create(data: CreateClientRequest): Promise<Client> {
    const response = await api.post<Client>("/api/v1/clients", data);
    return response.data;
  }

  /**
   * Atualiza um cliente
   */
  async update(id: number, data: UpdateClientRequest): Promise<Client> {
    const response = await api.put<Client>(`/api/v1/clients/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um cliente (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/clients/${id}`);
  }
}

export default new ClientService();
