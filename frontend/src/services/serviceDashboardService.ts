import api from "./api";

export interface NameCount { name: string; count: number; }
export interface StageCount { stage_name: string; count: number; }
export interface CollaboratorStat { user_id: number; name: string; activities: number; won: number; lost: number; recalibrations: number; }
export interface DayPoint { period: string; won: number; lost: number; activities: number; }
export interface RecalibrationStats { overdue: number; due_30: number; due_50: number; due_90: number; total_devices: number; }

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
  evolution: DayPoint[];
  recalibrations: RecalibrationStats;
  modality: NameCount[];
  service_type: NameCount[];
}

class ServiceDashboardService {
  async get(start?: string, end?: string, board?: number): Promise<ServiceDashboard> {
    const r = await api.get<ServiceDashboard>("/api/v1/service-dashboard", { params: { start, end, board } });
    return r.data;
  }
}

export default new ServiceDashboardService();
