import api from "./api";
import { List } from "../types";

/**
 * Service para gerenciar listas (colunas do Kanban)
 */
const listService = {
  /**
   * Lista todas as listas de um board
   */
  list: async (params: { board_id: number }): Promise<List[]> => {
    const response = await api.get(`/api/v1/boards/${params.board_id}/lists`);
    return response.data;
  },

  /**
   * Busca uma lista por ID (através do board)
   */
  getById: async (boardId: number, listId: number): Promise<List> => {
    const response = await api.get(`/api/v1/boards/${boardId}/lists`);
    const lists = response.data as List[];
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      throw new Error("Lista não encontrada");
    }
    return list;
  },

  /**
   * Cria uma nova lista
   */
  create: async (data: {
    board_id: number;
    name: string;
    position?: number;
    color?: string;
  }): Promise<List> => {
    const response = await api.post(`/api/v1/boards/${data.board_id}/lists`, data);
    return response.data;
  },

  /**
   * Atualiza uma lista existente
   */
  update: async (
    boardId: number,
    listId: number,
    data: {
      name?: string;
      position?: number;
      color?: string;
      is_deleted?: boolean;
    }
  ): Promise<List> => {
    const response = await api.put(`/api/v1/boards/${boardId}/lists/${listId}`, data);
    return response.data;
  },

  /**
   * Deleta uma lista permanentemente
   */
  delete: async (boardId: number, listId: number): Promise<void> => {
    await api.delete(`/api/v1/boards/${boardId}/lists/${listId}`);
  },

  /**
   * Move/reordena uma lista para nova posição
   */
  move: async (boardId: number, listId: number, newPosition: number): Promise<List> => {
    const response = await api.put(`/api/v1/boards/${boardId}/lists/${listId}/move`, {
      new_position: newPosition,
    });
    return response.data;
  },
};

export default listService;
