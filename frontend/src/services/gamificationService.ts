/**
 * Gamification Service - Serviço para gerenciamento de gamificação
 * Responsável por operações de pontos, badges e rankings
 */
import api from "./api";

// Types
export interface GamificationSummary {
  user_id: number;
  user_name: string;
  total_points: number;
  badges: UserBadge[];
  current_week_points: number;
  current_month_points: number;
  weekly_rank: number | null;
  monthly_rank: number | null;
  quarterly_rank: number | null;
  annual_rank: number | null;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string | null;
  criteria_type: "automatic" | "manual";
  criteria: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  awarded_at: string;
  badge?: Badge;
  badge_name?: string;
  badge_description?: string;
  badge_icon?: string;
}

export interface Ranking {
  id: number;
  user_id: number;
  user_name: string;
  period_type: "weekly" | "monthly" | "quarterly" | "annual";
  period_start: string;
  period_end: string;
  total_points: number;
  rank_position: number;
  created_at: string;
  updated_at: string;
}

export interface RankingListResponse {
  rankings: Ranking[];
  period_type: string;
  period_start: string;
  period_end: string;
  total: number;
}

export interface ActionPoints {
  id: number;
  action_type: string;
  points: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Serviço de Gamificação
 */
class GamificationService {
  /**
   * Busca resumo de gamificação do usuário logado
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
   * Lista todos os badges disponíveis
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
   * Lista rankings por período
   */
  async getRankings(periodType: "weekly" | "monthly" | "quarterly" | "annual"): Promise<RankingListResponse> {
    const response = await api.get<RankingListResponse>("/api/v1/gamification/rankings", {
      params: { period_type: periodType },
    });
    return response.data;
  }

  /**
   * Recalcula rankings (admin only)
   */
  async recalculateRankings(periodType: "weekly" | "monthly" | "quarterly" | "annual"): Promise<RankingListResponse> {
    const response = await api.post<RankingListResponse>("/api/v1/gamification/rankings/calculate", {
      period_type: periodType,
    });
    return response.data;
  }

  /**
   * Atribui pontos a um usuário (admin only)
   */
  async awardPoints(userId: number, points: number, reason: string): Promise<any> {
    const response = await api.post("/api/v1/gamification/points", {
      user_id: userId,
      points,
      reason,
    });
    return response.data;
  }

  /**
   * Cria um novo badge (admin only)
   */
  async createBadge(data: {
    name: string;
    description: string;
    icon_url?: string;
    criteria_type: "automatic" | "manual";
    criteria?: Record<string, any>;
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
      criteria?: Record<string, any>;
    }
  ): Promise<Badge> {
    const response = await api.put<Badge>(`/api/v1/gamification/badges/${badgeId}`, data);
    return response.data;
  }

  /**
   * Deleta badge (admin only)
   */
  async deleteBadge(badgeId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/v1/gamification/badges/${badgeId}`);
    return response.data;
  }

  /**
   * Lista todas as configurações de pontos
   */
  async listActionPoints(): Promise<ActionPoints[]> {
    const response = await api.get<ActionPoints[]>("/api/v1/gamification/action-points");
    return response.data;
  }

  /**
   * Busca configuração de pontos por tipo
   */
  async getActionPointsByType(actionType: string): Promise<ActionPoints> {
    const response = await api.get<ActionPoints>(`/api/v1/gamification/action-points/${actionType}`);
    return response.data;
  }

  /**
   * Atualiza configuração de pontos (admin only)
   */
  async updateActionPoints(actionType: string, data: { points?: number; is_active?: boolean; description?: string }): Promise<ActionPoints> {
    const response = await api.put<ActionPoints>(`/api/v1/gamification/action-points/${actionType}`, data);
    return response.data;
  }

  /**
   * Inicializa configurações padrão de pontos (admin only)
   */
  async initializeActionPoints(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/api/v1/gamification/action-points/initialize");
    return response.data;
  }
}

export default new GamificationService();
