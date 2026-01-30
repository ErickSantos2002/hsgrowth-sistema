import api from "./api";
import {
  Board,
  BoardListResponse,
  BoardFilters,
  CreateBoardRequest,
  UpdateBoardRequest,
} from "../types";

/**
 * Serviço de boards
 * Gerencia CRUD de boards (quadros kanban)
 */
class BoardService {
  /**
   * Lista boards com paginação e filtros
   */
  async list(filters?: BoardFilters): Promise<BoardListResponse> {
    const response = await api.get<BoardListResponse>("/api/v1/boards", {
      params: filters,
    });

    return response.data;
  }

  /**
   * Busca um board por ID
   */
  async getById(id: number): Promise<Board> {
    const response = await api.get<Board>(`/api/v1/boards/${id}`);
    return response.data;
  }

  /**
   * Cria um novo board
   */
  async create(data: CreateBoardRequest): Promise<Board> {
    const response = await api.post<Board>("/api/v1/boards", data);
    return response.data;
  }

  /**
   * Atualiza um board
   */
  async update(id: number, data: UpdateBoardRequest): Promise<Board> {
    const response = await api.put<Board>(`/api/v1/boards/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um board (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/boards/${id}`);
  }

  /**
   * Duplica um board
   */
  async duplicate(
    id: number,
    newName?: string,
    copyLists = true,
    copyCards = false
  ): Promise<Board> {
    const response = await api.post<Board>(`/api/v1/boards/${id}/duplicate`, {
      new_name: newName || `Board ${id} - Cópia`,
      copy_lists: copyLists,
      copy_cards: copyCards,
    });
    return response.data;
  }

  /**
   * Busca as listas de um board
   */
  async getLists(boardId: number): Promise<any[]> {
    const response = await api.get(`/api/v1/boards/${boardId}/lists`);
    return response.data;
  }
}

export default new BoardService();
