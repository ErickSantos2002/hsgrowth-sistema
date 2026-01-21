import api from "./api";

/**
 * Tipos de Automações
 */
export type AutomationNodeType = "trigger" | "action" | "condition";

export type TriggerType =
  | "card_created"
  | "card_won"
  | "card_lost"
  | "card_moved"
  | "card_overdue"
  | "scheduled";

export type ActionType =
  | "create_card"
  | "send_email"
  | "create_notification"
  | "assign_user"
  | "add_tag"
  | "move_to_list"
  | "update_field";

export type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

/**
 * Interfaces para Nodes do React Flow
 */
export interface AutomationNodeData {
  label: string;
  type: AutomationNodeType;
  config: TriggerConfig | ActionConfig | ConditionConfig;
}

export interface TriggerConfig {
  triggerType: TriggerType;
  boardId?: number;
  listId?: number;
  scheduleType?: "daily" | "weekly" | "monthly";
  scheduleTime?: string;
  scheduleDays?: number[];
}

export interface ActionConfig {
  actionType: ActionType;
  targetBoardId?: number;
  targetListId?: number;
  targetUserId?: number;
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
  notificationMessage?: string;
  tagName?: string;
  fieldId?: number;
  fieldValue?: string;
}

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

/**
 * Interface de Automação
 */
export interface Automation {
  id: number;
  name: string;
  description?: string;
  board_id?: number;
  board_name?: string;
  is_active: boolean;
  nodes: any[]; // React Flow nodes
  edges: any[]; // React Flow edges
  created_by: number;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  success_count: number;
  error_count: number;
}

export interface AutomationExecution {
  id: number;
  automation_id: number;
  status: "success" | "error";
  execution_time_ms: number;
  error_message?: string;
  executed_at: string;
  triggered_by?: string;
}

export interface AutomationStats {
  total_automations: number;
  active_automations: number;
  total_executions: number;
  success_rate: number;
}

/**
 * Interfaces de Request
 */
export interface CreateAutomationRequest {
  name: string;
  description?: string;
  board_id?: number;
  is_active: boolean;
  nodes: any[];
  edges: any[];
}

export interface UpdateAutomationRequest {
  name?: string;
  description?: string;
  board_id?: number;
  is_active?: boolean;
  nodes?: any[];
  edges?: any[];
}

/**
 * Serviço de Automações
 * Gerencia automações visuais tipo n8n
 */
class AutomationService {
  /**
   * Lista todas as automações
   */
  async list(boardId?: number): Promise<Automation[]> {
    const params = boardId ? { board_id: boardId } : {};
    const response = await api.get<Automation[]>("/api/v1/automations", { params });
    return response.data;
  }

  /**
   * Busca uma automação por ID
   */
  async getById(id: number): Promise<Automation> {
    const response = await api.get<Automation>(`/api/v1/automations/${id}`);
    return response.data;
  }

  /**
   * Cria uma nova automação
   */
  async create(data: CreateAutomationRequest): Promise<Automation> {
    const response = await api.post<Automation>("/api/v1/automations", data);
    return response.data;
  }

  /**
   * Atualiza uma automação
   */
  async update(id: number, data: UpdateAutomationRequest): Promise<Automation> {
    const response = await api.put<Automation>(`/api/v1/automations/${id}`, data);
    return response.data;
  }

  /**
   * Deleta uma automação
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/automations/${id}`);
  }

  /**
   * Ativa/Desativa uma automação
   */
  async toggleActive(id: number, isActive: boolean): Promise<Automation> {
    const response = await api.patch<Automation>(`/api/v1/automations/${id}/toggle`, {
      is_active: isActive,
    });
    return response.data;
  }

  /**
   * Busca execuções de uma automação
   */
  async getExecutions(id: number, page = 1, limit = 20): Promise<{
    executions: AutomationExecution[];
    total: number;
    page: number;
    total_pages: number;
  }> {
    const response = await api.get(`/api/v1/automations/${id}/executions`, {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Testa uma automação (execução manual)
   */
  async test(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/v1/automations/${id}/test`);
    return response.data;
  }

  /**
   * Busca estatísticas de automações
   */
  async getStats(): Promise<AutomationStats> {
    const response = await api.get<AutomationStats>("/api/v1/automations/stats");
    return response.data;
  }

  /**
   * Formata tipo de trigger
   */
  formatTriggerType(type: TriggerType): string {
    const labels: Record<TriggerType, string> = {
      card_created: "Card Criado",
      card_won: "Card Ganho",
      card_lost: "Card Perdido",
      card_moved: "Card Movido",
      card_overdue: "Card Atrasado",
      scheduled: "Agendado",
    };
    return labels[type] || type;
  }

  /**
   * Formata tipo de ação
   */
  formatActionType(type: ActionType): string {
    const labels: Record<ActionType, string> = {
      create_card: "Criar Card",
      send_email: "Enviar Email",
      create_notification: "Criar Notificação",
      assign_user: "Atribuir Usuário",
      add_tag: "Adicionar Tag",
      move_to_list: "Mover para Lista",
      update_field: "Atualizar Campo",
    };
    return labels[type] || type;
  }

  /**
   * Retorna ícone para tipo de trigger
   */
  getTriggerIcon(type: TriggerType): string {
    const icons: Record<TriggerType, string> = {
      card_created: "Plus",
      card_won: "CheckCircle",
      card_lost: "XCircle",
      card_moved: "ArrowRight",
      card_overdue: "Clock",
      scheduled: "Calendar",
    };
    return icons[type] || "Zap";
  }

  /**
   * Retorna cor para tipo de trigger
   */
  getTriggerColor(type: TriggerType): string {
    const colors: Record<TriggerType, string> = {
      card_created: "blue",
      card_won: "green",
      card_lost: "red",
      card_moved: "purple",
      card_overdue: "orange",
      scheduled: "cyan",
    };
    return colors[type] || "gray";
  }

  /**
   * Retorna ícone para tipo de ação
   */
  getActionIcon(type: ActionType): string {
    const icons: Record<ActionType, string> = {
      create_card: "FilePlus",
      send_email: "Mail",
      create_notification: "Bell",
      assign_user: "UserPlus",
      add_tag: "Tag",
      move_to_list: "MoveRight",
      update_field: "Edit",
    };
    return icons[type] || "Zap";
  }

  /**
   * Retorna cor para tipo de ação
   */
  getActionColor(type: ActionType): string {
    const colors: Record<ActionType, string> = {
      create_card: "blue",
      send_email: "yellow",
      create_notification: "purple",
      assign_user: "green",
      add_tag: "pink",
      move_to_list: "indigo",
      update_field: "orange",
    };
    return colors[type] || "gray";
  }
}

export default new AutomationService();
