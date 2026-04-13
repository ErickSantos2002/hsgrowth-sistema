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
  task_type: "call" | "meeting" | "task" | "follow_up" | "deadline" | "email" | "lunch" | "other";
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
  card_title?: string;
  card_client_name?: string;
  // Microsoft Teams
  teams_meeting_id?: string | null;
  teams_join_url?: string | null;
  transcript_raw?: string | null;
  transcript_analysis?: string | null;
}

export interface CreateCardTaskRequest {
  card_id: number;
  assigned_to_id?: number;
  title: string;
  description?: string;
  task_type?: "call" | "meeting" | "task" | "follow_up" | "other" | "email" | "deadline" | "lunch";
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
  task_type?: "call" | "meeting" | "task" | "follow_up" | "other" | "email" | "deadline" | "lunch";
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
    due_date_start?: string;
    due_date_end?: string;
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
   * Marca uma reunião como NoShow — seta is_completed, completed_at e is_noshow=true de uma vez.
   * Deve ser usado exclusivamente para tarefas do tipo "meeting".
   */
  async markNoShow(id: number): Promise<CardTask> {
    const response = await api.patch<CardTask>(`/api/v1/card-tasks/${id}/noshow`);
    return response.data;
  }

  /**
   * Busca todas as tarefas de um card (pendentes e concluídas) para o calendário.
   * Usa page_size máximo permitido pelo backend (100) para trazer o máximo possível de uma vez.
   * Em casos raros de cards com mais de 100 tarefas, faz múltiplas requisições.
   */
  async getAllByCard(cardId: number): Promise<CardTask[]> {
    const PAGE_SIZE = 100; // limite máximo definido no schema do backend (le=100)
    const firstPage = await this.list({ card_id: cardId, page_size: PAGE_SIZE, page: 1 });
    const allTasks = [...firstPage.tasks];

    // Se houver mais páginas, busca as demais em paralelo
    if (firstPage.total_pages > 1) {
      const pageNumbers = Array.from(
        { length: firstPage.total_pages - 1 },
        (_, i) => i + 2
      );
      const remainingPages = await Promise.all(
        pageNumbers.map((p) =>
          this.list({ card_id: cardId, page_size: PAGE_SIZE, page: p })
        )
      );
      for (const page of remainingPages) {
        allTasks.push(...page.tasks);
      }
    }

    return allTasks;
  }

  /**
   * Busca todas as tarefas para o calendário global (sem filtro de card_id).
   * Aceita filtro opcional por responsável. Usa paginação automática com
   * page_size máximo (100) para trazer todos os registros em menos requisições.
   */
  async getForCalendar(assignedToId?: number): Promise<CardTask[]> {
    const PAGE_SIZE = 100;
    const firstPage = await this.list({
      assigned_to_id: assignedToId,
      page_size: PAGE_SIZE,
      page: 1,
    });
    const allTasks = [...firstPage.tasks];

    // Se houver mais páginas, busca as demais em paralelo
    if (firstPage.total_pages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.total_pages - 1 }, (_, i) =>
          this.list({
            assigned_to_id: assignedToId,
            page_size: PAGE_SIZE,
            page: i + 2,
          })
        )
      );
      for (const page of remainingPages) {
        allTasks.push(...page.tasks);
      }
    }

    return allTasks;
  }

  /**
   * Deleta uma tarefa
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/card-tasks/${id}`);
  }

  /**
   * Cria uma reunião no Microsoft Teams para a atividade e salva o link.
   * A atividade deve ser do tipo "meeting" e ter due_date definida.
   */
  async createTeamsMeeting(taskId: number): Promise<CardTask> {
    const response = await api.post<CardTask>(`/api/v1/card-tasks/${taskId}/teams-meeting`);
    return response.data;
  }

  /**
   * Busca a transcrição da reunião Teams e executa análise com IA (GPT-4o).
   * Salva transcript_raw e transcript_analysis na atividade.
   */
  async fetchTranscript(taskId: number): Promise<CardTask> {
    const response = await api.post<CardTask>(`/api/v1/card-tasks/${taskId}/fetch-transcript`);
    return response.data;
  }
}

export default new CardTaskService();
