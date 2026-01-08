import api from "./api";
import {
  Card,
  PaginatedResponse,
  CardFilters,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
} from "../types";

/**
 * Serviço de cards
 * Gerencia CRUD de cards (oportunidades/leads)
 */
class CardService {
  /**
   * Lista cards com paginação e filtros
   */
  async list(filters?: CardFilters): Promise<PaginatedResponse<Card>> {
    const response = await api.get<PaginatedResponse<Card>>("/api/v1/cards", {
      params: filters,
    });

    return response.data;
  }

  /**
   * Busca um card por ID
   */
  async getById(id: number): Promise<Card> {
    const response = await api.get<Card>(`/api/v1/cards/${id}`);
    return response.data;
  }

  /**
   * Cria um novo card
   */
  async create(data: CreateCardRequest): Promise<Card> {
    const response = await api.post<Card>("/api/v1/cards", data);
    return response.data;
  }

  /**
   * Atualiza um card
   */
  async update(id: number, data: UpdateCardRequest): Promise<Card> {
    const response = await api.put<Card>(`/api/v1/cards/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um card (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/cards/${id}`);
  }

  /**
   * Move um card entre listas
   */
  async move(id: number, data: MoveCardRequest): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/move`, data);
    return response.data;
  }

  /**
   * Atribui um card a um usuário
   */
  async assign(id: number, userId: number): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/assign`, {
      user_id: userId,
    });
    return response.data;
  }

  /**
   * Marca um card como ganho
   */
  async markAsWon(id: number): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/win`);
    return response.data;
  }

  /**
   * Marca um card como perdido
   */
  async markAsLost(id: number): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/lose`);
    return response.data;
  }
}

export default new CardService();
