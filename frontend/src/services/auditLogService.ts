import api from "./api";

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  /** Snapshot do estado anterior ao evento (UPDATE/DELETE). Null para CREATEs. */
  data_before: Record<string, unknown> | null;
  /** Snapshot do estado no momento do evento (CREATE/UPDATE). */
  data_after: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface AuditLogFilters {
  page?: number;
  page_size?: number;
  user_id?: number;
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Serviço para gerenciar logs de auditoria
 */
class AuditLogService {
  /**
   * Busca logs de auditoria com filtros e paginação
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.page_size) params.append("page_size", filters.page_size.toString());
    if (filters.user_id) params.append("user_id", filters.user_id.toString());
    if (filters.action) params.append("action", filters.action);
    if (filters.entity_type) params.append("entity_type", filters.entity_type);
    if (filters.start_date) params.append("start_date", filters.start_date);
    if (filters.end_date) params.append("end_date", filters.end_date);

    const response = await api.get<AuditLogsResponse>(
      `/api/v1/audit-logs?${params.toString()}`
    );

    return response.data;
  }

  /**
   * Busca tipos de ações disponíveis
   */
  async getActions(): Promise<string[]> {
    const response = await api.get<{ actions: string[] }>("/api/v1/audit-logs/actions");
    return response.data.actions;
  }

  /**
   * Busca tipos de entidades disponíveis
   */
  async getEntityTypes(): Promise<string[]> {
    const response = await api.get<{ entity_types: string[] }>(
      "/api/v1/audit-logs/entity-types"
    );
    return response.data.entity_types;
  }
}

// Exporta uma instância única do serviço
export default new AuditLogService();
