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
  collection_won_value: number;
  activities_count: number;
  avg_ticket: number;
  win_rate: number;
  cards_by_stage: StageCount[];
  cards_by_stage_flow: StageCount[];
  activities_by_type: NameCount[];
  collaborators: CollaboratorStat[];
  loss_reasons: NameCount[];
  evolution: DayPoint[];
  recalibrations: RecalibrationStats;
  modality: NameCount[];
  service_type: NameCount[];
  won_by_service_type: NameCount[];
}

export interface CollaboratorOption { id: number; name: string; }

class ServiceDashboardService {
  async get(start?: string, end?: string, board?: number, userId?: number, collectionType?: string): Promise<ServiceDashboard> {
    const r = await api.get<ServiceDashboard>("/api/v1/service-dashboard", { params: { start, end, board, user_id: userId, collection_type: collectionType } });
    return r.data;
  }

  async listCollaborators(board?: number): Promise<CollaboratorOption[]> {
    const r = await api.get<CollaboratorOption[]>("/api/v1/service-dashboard/collaborators", { params: { board } });
    return r.data;
  }
}

export default new ServiceDashboardService();
