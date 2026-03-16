/**
 * Gamification Service - Serviço para gerenciamento de gamificação v2
 * Suporta pontuação por board_type (prospecting/acquisition),
 * rankings separados por board e sistema de comissão.
 */
import api from "./api";

// ========== TIPOS ==========

export type BoardType = "prospecting" | "acquisition";
export type PeriodType = "weekly" | "monthly" | "quarterly" | "annual";

export interface BoardPointsSummary {
  board_type: BoardType;
  total_points: number;
  week_points: number;
  month_points: number;
  weekly_rank: number | null;
  monthly_rank: number | null;
  quarterly_rank: number | null;
  annual_rank: number | null;
}

export interface GamificationSummary {
  user_id: number;
  user_name: string;
  user_role: string | null;
  total_points: number;
  badges: UserBadge[];
  prospecting: BoardPointsSummary;
  acquisition: BoardPointsSummary;
}

export interface Badge {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria_type: "automatic" | "manual";
  criteria: Record<string, any> | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  awarded_at: string;
  awarded_by_id: number | null;
  badge_name?: string | null;
  badge_description?: string | null;
  badge_icon?: string | null;
}

export interface Ranking {
  id: number;
  user_id: number;
  user_name: string | null;
  user_role: string | null;
  board_type: BoardType;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_points: number;
  rank_position: number;
}

export interface RankingListResponse {
  rankings: Ranking[];
  board_type: BoardType;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  last_calculated_at: string | null;
}

export interface ActionPoints {
  id: number;
  board_type: BoardType;
  action_type: string;
  points: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamificationPointRecord {
  id: number;
  user_id: number;
  user_name: string | null;
  board_type: BoardType | null;
  points: number;
  reason: string;
  description: string | null;
  is_commission: boolean;
  commission_source_user_id: number | null;
  commission_ratio: string | null;
  original_points: number | null;
  created_at: string;
}

export interface GamificationPointListResponse {
  points: GamificationPointRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========== SERVIÇO ==========

/**
 * Serviço de Gamificação v2
 */
class GamificationService {
  /**
   * Busca resumo de gamificação do usuário logado.
   * Retorna dados separados por board (prospecting/acquisition).
   */
  async getMySummary(): Promise<GamificationSummary> {
    const response = await api.get<GamificationSummary>("/api/v1/gamification/me");
    return response.data;
  }

  /**
   * Busca resumo de gamificação de um usuário específico
   */
  async getUserSummary(userId: number): Promise<GamificationSummary> {
    const response = await api.get<GamificationSummary>(`/api/v1/gamification/users/${userId}`);
    return response.data;
  }

  /**
   * Lista todos os badges disponíveis (excluindo soft-deleted)
   */
  async getAllBadges(): Promise<Badge[]> {
    const response = await api.get<Badge[]>("/api/v1/gamification/badges");
    return response.data;
  }

  /**
   * Busca badges do usuário logado
   */
  async getMyBadges(): Promise<UserBadge[]> {
    const response = await api.get<UserBadge[]>("/api/v1/gamification/badges/me");
    return response.data;
  }

  /**
   * Busca badges de um usuário específico
   */
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    const response = await api.get<UserBadge[]>(`/api/v1/gamification/badges/users/${userId}`);
    return response.data;
  }

  /**
   * Lista rankings de um board e período específicos.
   * Retorna o último ranking calculado pelo scheduler (atualizado a cada hora).
   *
   * @param boardType - Board do ranking (prospecting ou acquisition)
   * @param periodType - Tipo de período (weekly, monthly, quarterly, annual)
   * @param limit - Limite de resultados (padrão: 100)
   */
  async getRankings(
    boardType: BoardType,
    periodType: PeriodType,
    limit = 100
  ): Promise<RankingListResponse> {
    const response = await api.get<RankingListResponse>("/api/v1/gamification/rankings", {
      params: { board_type: boardType, period_type: periodType, limit },
    });
    return response.data;
  }

  /**
   * Força recálculo dos rankings para um board e período (admin only)
   */
  async recalculateRankings(
    boardType: BoardType,
    periodType: PeriodType
  ): Promise<RankingListResponse> {
    const response = await api.post<RankingListResponse>("/api/v1/gamification/rankings/calculate", {
      board_type: boardType,
      period_type: periodType,
    });
    return response.data;
  }

  /**
   * Cria um novo badge (admin only)
   */
  async createBadge(data: {
    name: string;
    description?: string;
    icon_url?: string;
    criteria_type: "automatic" | "manual";
    criteria?: Record<string, any> | null;
  }): Promise<Badge> {
    const response = await api.post<Badge>("/api/v1/gamification/badges", data);
    return response.data;
  }

  /**
   * Atribui badge a um usuário (admin only)
   */
  async awardBadge(badgeId: number, userId: number): Promise<UserBadge> {
    const response = await api.post<UserBadge>(`/api/v1/gamification/badges/${badgeId}/award`, {
      user_id: userId,
    });
    return response.data;
  }

  /**
   * Busca badge por ID
   */
  async getBadgeById(badgeId: number): Promise<Badge> {
    const response = await api.get<Badge>(`/api/v1/gamification/badges/${badgeId}`);
    return response.data;
  }

  /**
   * Atualiza badge (admin only)
   */
  async updateBadge(
    badgeId: number,
    data: {
      name?: string;
      description?: string;
      icon_url?: string;
      criteria_type?: "automatic" | "manual";
      criteria?: Record<string, any> | null;
      is_active?: boolean;
    }
  ): Promise<Badge> {
    const response = await api.put<Badge>(`/api/v1/gamification/badges/${badgeId}`, data);
    return response.data;
  }

  /**
   * Soft delete de badge (admin only)
   * Preserva histórico de user_badges dos usuários que já conquistaram.
   */
  async deleteBadge(badgeId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/v1/gamification/badges/${badgeId}`);
    return response.data;
  }

  /**
   * Lista configurações de pontos por ação.
   *
   * @param boardType - Filtrar por board (opcional). Sem filtro retorna todos.
   */
  async listActionPoints(boardType?: BoardType): Promise<ActionPoints[]> {
    const response = await api.get<ActionPoints[]>("/api/v1/gamification/action-points", {
      params: boardType ? { board_type: boardType } : undefined,
    });
    return response.data;
  }

  /**
   * Busca configuração de pontos por board e tipo de ação
   */
  async getActionPoints(boardType: BoardType, actionType: string): Promise<ActionPoints> {
    const response = await api.get<ActionPoints>(
      `/api/v1/gamification/action-points/${boardType}/${actionType}`
    );
    return response.data;
  }

  /**
   * Atualiza configuração de pontos (admin only)
   */
  async updateActionPoints(
    boardType: BoardType,
    actionType: string,
    data: { points?: number; is_active?: boolean; description?: string }
  ): Promise<ActionPoints> {
    const response = await api.put<ActionPoints>(
      `/api/v1/gamification/action-points/${boardType}/${actionType}`,
      data
    );
    return response.data;
  }

  /**
   * Busca histórico de pontos do usuário logado (paginado)
   *
   * @param page - Número da página (padrão: 1)
   * @param pageSize - Itens por página (padrão: 20)
   * @param filters - Filtros opcionais (reason, board_type, dateFrom, dateTo)
   */
  async getMyPointsHistory(
    page = 1,
    pageSize = 20,
    filters?: { reason?: string; board_type?: BoardType; dateFrom?: string; dateTo?: string }
  ): Promise<GamificationPointListResponse> {
    const response = await api.get<GamificationPointListResponse>("/api/v1/gamification/points/me", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  }

  /**
   * Busca histórico de pontos de um usuário específico (admin/manager only)
   */
  async getUserPointsHistory(
    userId: number,
    page = 1,
    pageSize = 20,
    filters?: { reason?: string; board_type?: BoardType; dateFrom?: string; dateTo?: string }
  ): Promise<GamificationPointListResponse> {
    const response = await api.get<GamificationPointListResponse>(
      `/api/v1/gamification/points/users/${userId}`,
      { params: { page, page_size: pageSize, ...filters } }
    );
    return response.data;
  }

  /**
   * Busca histórico de pontos de toda a equipe (admin/manager only)
   */
  async getAllPointsHistory(
    page = 1,
    pageSize = 20,
    filters?: { reason?: string; user_id?: number; board_type?: BoardType; dateFrom?: string; dateTo?: string }
  ): Promise<GamificationPointListResponse> {
    const response = await api.get<GamificationPointListResponse>("/api/v1/gamification/points", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  }
}

export default new GamificationService();
