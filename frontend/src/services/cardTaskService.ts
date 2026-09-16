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
  is_valid?: boolean | null;
  is_noshow?: boolean;
  is_cancelled?: boolean;
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
  // Reunião por vídeo dentro do CRM (Daily)
  meeting_provider?: string | null;
  daily_room_url?: string | null;
  public_access_token?: string | null;
  meeting_started_at?: string | null;
  contact_joined_at?: string | null;
  meeting_ended_at?: string | null;
  // Gravação da reunião
  recording_status?: string | null;
  recording_duration_seconds?: number | null;
  recording_size_bytes?: number | null;
  recording_ready_at?: string | null;
  recording_error?: string | null;
  transcript_status?: string | null;
  teams_event_id?: string | null;
  transcript_raw?: string | null;
  transcript_analysis?: string | null;
  // Trechos gravados: uma reunião pode ter vários (o vendedor para e recomeça)
  gravacoes?: GravacaoTrecho[];
}

export interface GravacaoTrecho {
  id: number;
  ordem: number;
  status: "processing" | "ready" | "failed" | "expired";
  duracao_segundos?: number | null;
  tamanho_bytes?: number | null;
  pronta_em?: string | null;
  erro?: string | null;
}

/** Uma sugestão que a IA deu durante a reunião. */
export interface SugestaoDaIA {
  id: number;
  criado_em: string;
  quem_pediu?: string | null;
  trecho?: string | null;
  leitura: string;
  fala: string;
  pergunta?: string | null;
  alertas: string[];
  fato_crm?: string | null;
  marcadores: string[];
}

/** Uma fala da conversa, como o backend espera receber. */
export interface FalaParaIA {
  papel: "time" | "cliente";
  nome: string;
  texto: string;
  em?: string;
}

export interface CreateCardTaskRequest {
  card_id: number;
  assigned_to_id?: number;
  title: string;
  description?: string;
  task_type?: "call" | "meeting" | "task" | "follow_up" | "other" | "email" | "deadline" | "lunch" | "whatsapp" | "linkedin";
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
  task_type?: "call" | "meeting" | "task" | "follow_up" | "other" | "email" | "deadline" | "lunch" | "whatsapp" | "linkedin";
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
    assignee_role?: string;
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
  async getOverdue(userId?: number, assigneeRole?: string): Promise<CardTask[]> {
    const response = await api.get<CardTask[]>("/api/v1/card-tasks/overdue", {
      params: { user_id: userId, assignee_role: assigneeRole },
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
  async toggleComplete(id: number, isCompleted: boolean, isValid?: boolean, notes?: string): Promise<CardTask> {
    const response = await api.patch<CardTask>(`/api/v1/card-tasks/${id}/complete`, {
      is_completed: isCompleted,
      ...(isCompleted && isValid !== undefined ? { is_valid: isValid } : {}),
      ...(notes !== undefined ? { notes } : {}),
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
   * Busca todas as tarefas de um dia específico (para o modal "+N mais" do calendário).
   * Usa page_size=500 para cobrir dias com muitas atividades em uma única requisição.
   */
  async getForDay(date: Date, assignedToId?: number): Promise<CardTask[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const result = await this.list({
      assigned_to_id: assignedToId,
      due_date_start: start.toISOString(),
      due_date_end: end.toISOString(),
      page_size: 500,
      page: 1,
    });
    return result.tasks;
  }

  /**
   * Busca tarefas para o calendário global filtradas pelo intervalo visível.
   * Busca apenas a primeira página (100 tarefas) — suficiente para exibir
   * um mês no grid sem sobrecarregar o sistema com dezenas de requests paralelos.
   */
  async getForCalendar(
    assignedToId?: number,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<CardTask[]> {
    const result = await this.list({
      assigned_to_id: assignedToId,
      due_date_start: dateFrom?.toISOString(),
      due_date_end: dateTo?.toISOString(),
      page_size: 100,
      page: 1,
    });
    return result.tasks;
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

  async cancelTeamsMeeting(taskId: number): Promise<CardTask> {
    const response = await api.post<CardTask>(`/api/v1/card-tasks/${taskId}/cancel-teams`);
    return response.data;
  }

  /**
   * Cria a sala de reunião por vídeo dentro do CRM (Daily) e agenda o evento
   * no Outlook, que envia o convite. Devolve o link público do convidado.
   */
  async createDailyRoom(taskId: number): Promise<{
    room_url: string;
    public_link: string;
    public_access_token: string;
  }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/daily-room`);
    return response.data;
  }

  /** Token de anfitrião para entrar na sala de reunião por vídeo. */
  async getDailyHostToken(taskId: number): Promise<{ token: string; room_url: string }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/daily-host-token`);
    return response.data;
  }

  /**
   * Link temporário para assistir ou baixar um trecho gravado.
   * O bucket é privado — nada abre por URL direta.
   */
  async linkGravacao(taskId: number, gravacaoId: number): Promise<{ url: string }> {
    const response = await api.get(
      `/api/v1/card-tasks/${taskId}/gravacoes/${gravacaoId}/link`
    );
    return response.data;
  }

  /** Link de um trecho para enviar ao cliente (expira, e fica registrado quem gerou). */
  async compartilharGravacao(
    taskId: number,
    gravacaoId: number
  ): Promise<{ url: string; expira_em_dias: number }> {
    const response = await api.post(
      `/api/v1/card-tasks/${taskId}/gravacoes/${gravacaoId}/compartilhar`
    );
    return response.data;
  }

  /**
   * Procura no Daily gravações que não chegaram pelo aviso automático.
   * Recuperação para quando um aviso se perde no caminho.
   */
  async sincronizarGravacoes(taskId: number): Promise<{ encontradas: number }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/gravacoes/sincronizar`);
    return response.data;
  }

  /** Cancela a sala de reunião por vídeo (a atividade permanece). */
  async cancelDailyRoom(taskId: number): Promise<void> {
    await api.delete(`/api/v1/card-tasks/${taskId}/daily-room`);
  }

  /**
   * Pede ajuda à IA durante a reunião ("Me ajuda aqui").
   *
   * Manda a conversa até o momento; o servidor soma o contexto do negócio.
   */
  async pedirAjudaAoVivo(taskId: number, falas: FalaParaIA[]): Promise<SugestaoDaIA> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/ajuda-ao-vivo`, { falas });
    return response.data;
  }

  /** Pedidos de ajuda já feitos nesta reunião, do mais recente ao mais antigo. */
  async listarAjudaAoVivo(taskId: number): Promise<SugestaoDaIA[]> {
    const response = await api.get(`/api/v1/card-tasks/${taskId}/ajuda-ao-vivo`);
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
