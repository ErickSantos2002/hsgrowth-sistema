import api from "./api";

export interface NameCount { name: string; count: number; }
export interface StageCount { stage_name: string; count: number; }
export interface CollaboratorStat { user_id: number; name: string; activities: number; won: number; lost: number; }

export interface ServiceDashboard {
  active_count: number;
  pipeline_value: number;
  stuck_count: number;
  won_count: number;
  lost_count: number;
  won_value: number;
  activities_count: number;
  avg_ticket: number;
  win_rate: number;
  cards_by_stage: StageCount[];
  activities_by_type: NameCount[];
  collaborators: CollaboratorStat[];
  loss_reasons: NameCount[];
}

class ServiceDashboardService {
  async get(start?: string, end?: string): Promise<ServiceDashboard> {
    const r = await api.get<ServiceDashboard>("/api/v1/service-dashboard", { params: { start, end } });
    return r.data;
  }
}

export default new ServiceDashboardService();
