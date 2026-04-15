import api from "./api";
import {
  Card,
  CardListResponse,
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
  async list(filters?: CardFilters): Promise<CardListResponse> {
    const response = await api.get<CardListResponse>("/api/v1/cards", {
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
   * Busca um card com todos os relacionamentos (expandido)
   * Ideal para página CardDetails
   */
  async getExpanded(id: number): Promise<any> {
    const response = await api.get(`/api/v1/cards/${id}/expanded`);
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
    const response = await api.put<Card>(`/api/v1/cards/${id}/move`, data);
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
   * Marca um card como ganho.
   * O backend localiza automaticamente a lista is_done_stage do board atual.
   */
  async markAsWon(id: number): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/win`);
    return response.data;
  }

  /**
   * Marca um card como perdido com o motivo informado.
   * O backend localiza automaticamente a lista is_lost_stage do board atual.
   */
  async markAsLost(id: number, lossReason: string): Promise<Card> {
    const response = await api.post<Card>(`/api/v1/cards/${id}/lose`, {
      loss_reason: lossReason,
    });
    return response.data;
  }

  /**
   * Reabre um negócio perdido criando um clone na lista de Prospecção
   * O card original permanece inalterado (continua perdido)
   */
  async reopen(
    id: number,
    data: { title: string; acquisition_channel_detail: string }
  ): Promise<{ new_card_id: number; new_card_title: string; original_card_id: number; message: string }> {
    const response = await api.post(`/api/v1/cards/${id}/reopen`, data);
    return response.data;
  }

  /**
   * Busca global de cards por título
   * Busca em todos os boards que o usuário tem acesso
   */
  async globalSearch(query: string, limit: number = 10): Promise<Card[]> {
    const response = await api.get<Card[]>("/api/v1/cards/search/global", {
      params: { q: query, limit },
    });
    return response.data;
  }

  /**
   * Envia e-mail via Microsoft 365 em nome do usuário logado.
   * O e-mail é registrado como atividade concluída no card.
   */
  async sendEmail(
    cardId: number,
    to: string[],
    subject: string,
    body: string,
    attachments?: { name: string; content_type: string; data_base64: string }[],
    taskId?: number,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/v1/cards/${cardId}/send-email`, {
      to,
      subject,
      body,
      attachments: attachments ?? [],
      ...(taskId ? { task_id: taskId } : {}),
    });
    return response.data;
  }
}

export default new CardService();
