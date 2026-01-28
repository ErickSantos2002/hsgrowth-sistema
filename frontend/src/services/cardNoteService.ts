import api from "./api";

/**
 * Tipos para CardNote (Anotações dos Cards)
 */
export interface CardNote {
  id: number;
  card_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface CreateCardNoteRequest {
  card_id: number;
  content: string;
}

export interface UpdateCardNoteRequest {
  content: string;
}

/**
 * Serviço de anotações dos cards
 */
class CardNoteService {
  /**
   * Cria uma nova anotação
   */
  async create(data: CreateCardNoteRequest): Promise<CardNote> {
    const response = await api.post<CardNote>("/api/v1/card-notes", data);
    return response.data;
  }

  /**
   * Busca anotações de um card
   */
  async getByCard(cardId: number): Promise<CardNote[]> {
    const response = await api.get<CardNote[]>(`/api/v1/card-notes/card/${cardId}`);
    return response.data;
  }

  /**
   * Busca uma anotação por ID
   */
  async getById(id: number): Promise<CardNote> {
    const response = await api.get<CardNote>(`/api/v1/card-notes/${id}`);
    return response.data;
  }

  /**
   * Atualiza uma anotação
   */
  async update(id: number, data: UpdateCardNoteRequest): Promise<CardNote> {
    const response = await api.put<CardNote>(`/api/v1/card-notes/${id}`, data);
    return response.data;
  }

  /**
   * Deleta uma anotação
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/card-notes/${id}`);
  }
}

export default new CardNoteService();
