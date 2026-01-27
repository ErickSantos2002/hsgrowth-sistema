import api from "./api";

/**
 * Tipos para Custom Fields
 */
export interface FieldDefinition {
  id: number;
  board_id: number;
  name: string;
  field_type: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
  is_required: boolean;
  options?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateFieldDefinitionRequest {
  board_id: number;
  name: string;
  field_type: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
  is_required?: boolean;
  options?: any;
}

export interface UpdateFieldDefinitionRequest {
  name?: string;
  field_type?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
  is_required?: boolean;
  options?: any;
}

export interface CardFieldValue {
  id: number;
  card_id: number;
  field_definition_id: number;
  value: any;
  created_at: string;
  updated_at: string;
  field_name?: string;
  field_type?: string;
}

export interface SetCardFieldValueRequest {
  field_definition_id: number;
  value: any;
}

/**
 * Serviço de campos personalizados
 */
class FieldService {
  // ========== DEFINIÇÕES DE CAMPOS ==========

  /**
   * Cria uma nova definição de campo
   */
  async createDefinition(data: CreateFieldDefinitionRequest): Promise<FieldDefinition> {
    const response = await api.post<FieldDefinition>("/api/v1/fields/definitions", data);
    return response.data;
  }

  /**
   * Lista definições de campos de um board
   */
  async listDefinitionsByBoard(boardId: number): Promise<FieldDefinition[]> {
    const response = await api.get<FieldDefinition[]>(
      `/api/v1/fields/definitions/board/${boardId}`
    );
    return response.data;
  }

  /**
   * Busca uma definição de campo por ID
   */
  async getDefinitionById(id: number): Promise<FieldDefinition> {
    const response = await api.get<FieldDefinition>(`/api/v1/fields/definitions/${id}`);
    return response.data;
  }

  /**
   * Atualiza uma definição de campo
   */
  async updateDefinition(
    id: number,
    data: UpdateFieldDefinitionRequest
  ): Promise<FieldDefinition> {
    const response = await api.put<FieldDefinition>(
      `/api/v1/fields/definitions/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Deleta uma definição de campo
   */
  async deleteDefinition(id: number): Promise<void> {
    await api.delete(`/api/v1/fields/definitions/${id}`);
  }

  // ========== VALORES DOS CAMPOS ==========

  /**
   * Define/atualiza o valor de um campo de um card
   */
  async setCardFieldValue(
    cardId: number,
    data: SetCardFieldValueRequest
  ): Promise<CardFieldValue> {
    const response = await api.put<CardFieldValue>(
      `/api/v1/fields/cards/${cardId}/values`,
      data
    );
    return response.data;
  }

  /**
   * Lista valores de campos de um card
   */
  async getCardFieldValues(cardId: number): Promise<CardFieldValue[]> {
    const response = await api.get<CardFieldValue[]>(`/api/v1/fields/cards/${cardId}/values`);
    return response.data;
  }

  /**
   * Deleta o valor de um campo de um card
   */
  async deleteCardFieldValue(cardId: number, fieldDefinitionId: number): Promise<void> {
    await api.delete(`/api/v1/fields/cards/${cardId}/values/${fieldDefinitionId}`);
  }
}

export default new FieldService();
