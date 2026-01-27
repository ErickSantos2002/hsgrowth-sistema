import api from "./api";

/**
 * Tipos para CardTask (Tarefas/Atividades dos Cards)
 */
export interface CardTask {
  id: number;
  card_id: number;
  assigned_to_id?: number;
  title: string;
  description?: string;
  task_type: "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";
  priority: "normal" | "high" | "urgent";
  due_date?: string;
  duration_minutes?: number;
  location?: string;
  video_link?: string;
  notes?: string;
  contact_name?: string;
  status: "free" | "busy";
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string;
  is_overdue?: boolean;
}

export interface CreateCardTaskRequest {
  card_id: number;
  assigned_to_id?: number;
  title: string;
  description?: string;
  task_type?: "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";
  priority?: "normal" | "high" | "urgent";
  due_date?: string;
  duration_minutes?: number;
  location?: string;
  video_link?: string;
  notes?: string;
  contact_name?: string;
  status?: "free" | "busy";
}

export interface UpdateCardTaskRequest {
  title?: string;
  description?: string;
  task_type?: "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";
  priority?: "normal" | "high" | "urgent";
  due_date?: string;
  duration_minutes?: number;
  location?: string;
  video_link?: string;
  notes?: string;
  contact_name?: string;
  status?: "free" | "busy";
}

export interface CardTaskListResponse {
  tasks: CardTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Serviço de tarefas/atividades dos cards
 */
class CardTaskService {
  /**
   * Cria uma nova tarefa
   */
  async create(data: CreateCardTaskRequest): Promise<CardTask> {
    const response = await api.post<CardTask>("/api/v1/card-tasks", data);
    return response.data;
  }

  /**
   * Lista tarefas com filtros
   */
  async list(params?: {
    card_id?: number;
    assigned_to_id?: number;
    task_type?: string;
    priority?: string;
    is_completed?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<CardTaskListResponse> {
    const response = await api.get<CardTaskListResponse>("/api/v1/card-tasks", { params });
    return response.data;
  }

  /**
   * Busca tarefas atrasadas
   */
  async getOverdue(userId?: number): Promise<CardTask[]> {
    const response = await api.get<CardTask[]>("/api/v1/card-tasks/overdue", {
      params: { user_id: userId },
    });
    return response.data;
  }

  /**
   * Busca tarefas pendentes de um card
   */
  async getPendingByCard(cardId: number, limit?: number): Promise<CardTask[]> {
    const response = await api.get<CardTask[]>(
      `/api/v1/card-tasks/card/${cardId}/pending`,
      { params: { limit } }
    );
    return response.data;
  }

  /**
   * Busca contadores de tarefas de um card
   */
  async getTaskCounts(cardId: number): Promise<{ total: number; pending: number; completed: number }> {
    const response = await api.get<{ total: number; pending: number; completed: number }>(
      `/api/v1/card-tasks/card/${cardId}/counts`
    );
    return response.data;
  }

  /**
   * Busca uma tarefa por ID
   */
  async getById(id: number): Promise<CardTask> {
    const response = await api.get<CardTask>(`/api/v1/card-tasks/${id}`);
    return response.data;
  }

  /**
   * Atualiza uma tarefa
   */
  async update(id: number, data: UpdateCardTaskRequest): Promise<CardTask> {
    const response = await api.put<CardTask>(`/api/v1/card-tasks/${id}`, data);
    return response.data;
  }

  /**
   * Marca/desmarca uma tarefa como concluída
   */
  async toggleComplete(id: number, isCompleted: boolean): Promise<CardTask> {
    const response = await api.patch<CardTask>(`/api/v1/card-tasks/${id}/complete`, {
      is_completed: isCompleted,
    });
    return response.data;
  }

  /**
   * Deleta uma tarefa
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/card-tasks/${id}`);
  }
}

export default new CardTaskService();
