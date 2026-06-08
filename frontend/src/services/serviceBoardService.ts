import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceBoard {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  lists_count?: number;
  cards_count?: number;
}

export interface ServiceBoardListResponse {
  boards: ServiceBoard[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ServiceList {
  id: number;
  board_id: number;
  name: string;
  color?: string;
  position: number;
  is_done_stage: boolean;
  is_lost_stage: boolean;
  created_at: string;
  updated_at: string;
  cards_count?: number;
}

export interface ServiceCard {
  id: number;
  list_id: number;
  title: string;
  description?: string;
  assigned_to_id?: number;
  due_date?: string;
  contact_info?: Record<string, any>;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCardListResponse {
  cards: ServiceCard[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateServiceBoardRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateServiceBoardRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_deleted?: boolean;
}

export interface CreateServiceListRequest {
  board_id: number;
  name: string;
  color?: string;
  position?: number;
  is_done_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface UpdateServiceListRequest {
  name?: string;
  color?: string;
  position?: number;
  is_done_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface CreateServiceCardRequest {
  list_id: number;
  title: string;
  description?: string;
  assigned_to_id?: number;
  due_date?: string;
  contact_info?: Record<string, any>;
}

export interface UpdateServiceCardRequest {
  title?: string;
  description?: string;
  list_id?: number;
  assigned_to_id?: number;
  due_date?: string;
  contact_info?: Record<string, any>;
  position?: number;
  is_deleted?: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/service-boards";

class ServiceBoardService {
  // Boards
  async list(params?: { is_deleted?: boolean; page?: number; page_size?: number }): Promise<ServiceBoardListResponse> {
    const r = await api.get<ServiceBoardListResponse>(BASE, { params });
    return r.data;
  }

  async getById(id: number): Promise<ServiceBoard> {
    const r = await api.get<ServiceBoard>(`${BASE}/${id}`);
    return r.data;
  }

  async create(data: CreateServiceBoardRequest): Promise<ServiceBoard> {
    const r = await api.post<ServiceBoard>(BASE, data);
    return r.data;
  }

  async update(id: number, data: UpdateServiceBoardRequest): Promise<ServiceBoard> {
    const r = await api.put<ServiceBoard>(`${BASE}/${id}`, data);
    return r.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  async duplicate(id: number, newName: string, copyLists = true): Promise<ServiceBoard> {
    const r = await api.post<ServiceBoard>(`${BASE}/${id}/duplicate`, {
      new_name: newName,
      copy_lists: copyLists,
    });
    return r.data;
  }

  // Lists
  async getLists(boardId: number): Promise<ServiceList[]> {
    const r = await api.get<ServiceList[]>(`${BASE}/${boardId}/lists`);
    return r.data;
  }

  async createList(boardId: number, data: CreateServiceListRequest): Promise<ServiceList> {
    const r = await api.post<ServiceList>(`${BASE}/${boardId}/lists`, data);
    return r.data;
  }

  async updateList(boardId: number, listId: number, data: UpdateServiceListRequest): Promise<ServiceList> {
    const r = await api.put<ServiceList>(`${BASE}/${boardId}/lists/${listId}`, data);
    return r.data;
  }

  async deleteList(boardId: number, listId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/lists/${listId}`);
  }

  async moveList(boardId: number, listId: number, newPosition: number): Promise<ServiceList> {
    const r = await api.put<ServiceList>(`${BASE}/${boardId}/lists/${listId}/move`, { new_position: newPosition });
    return r.data;
  }

  // Cards
  async getCards(boardId: number, page = 1, pageSize = 200): Promise<ServiceCardListResponse> {
    const r = await api.get<ServiceCardListResponse>(`${BASE}/${boardId}/cards`, {
      params: { page, page_size: pageSize },
    });
    return r.data;
  }

  async createCard(boardId: number, data: CreateServiceCardRequest): Promise<ServiceCard> {
    const r = await api.post<ServiceCard>(`${BASE}/${boardId}/cards`, data);
    return r.data;
  }

  async updateCard(boardId: number, cardId: number, data: UpdateServiceCardRequest): Promise<ServiceCard> {
    const r = await api.put<ServiceCard>(`${BASE}/${boardId}/cards/${cardId}`, data);
    return r.data;
  }

  async deleteCard(boardId: number, cardId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}`);
  }

  async moveCard(boardId: number, cardId: number, listId: number, position?: number): Promise<ServiceCard> {
    const r = await api.put<ServiceCard>(`${BASE}/${boardId}/cards/${cardId}/move`, {
      list_id: listId,
      position,
    });
    return r.data;
  }
}

export default new ServiceBoardService();
