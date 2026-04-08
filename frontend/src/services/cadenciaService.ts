import api from "./api";

// ==================== TIPOS ====================

export interface CadenciaItem {
  id: number;
  cadencia_id: number;
  activity_type: string;
  quantity: number;
}

export interface Cadencia {
  id: number;
  user_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  itens: CadenciaItem[];
}

export interface CadenciaItemInput {
  activity_type: string;
  quantity: number;
}

export interface CreateCadenciaRequest {
  name: string;
  itens: CadenciaItemInput[];
}

export interface UpdateCadenciaRequest {
  name?: string;
  is_active?: boolean;
  itens?: CadenciaItemInput[];
}

export interface TriggerItemResult {
  activity_type: string;
  requested: number;
  created: number;
  cards_affected: number;
}

export interface TriggerResult {
  cadencia_id: number;
  cadencia_name: string;
  total_activities_created: number;
  itens: TriggerItemResult[];
}

// ==================== LABELS ====================

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "follow_up", label: "Follow-up" },
  { value: "visita", label: "Visita" },
  { value: "tarefa", label: "Tarefa" },
  { value: "outro", label: "Outro" },
] as const;

export function getActivityTypeLabel(type: string): string {
  const opt = ACTIVITY_TYPE_OPTIONS.find((o) => o.value === type);
  return opt ? opt.label : type;
}

// ==================== API ====================

const cadenciaService = {
  listMy: async (): Promise<Cadencia[]> => {
    const res = await api.get("/api/v1/cadencias/my");
    return res.data;
  },

  create: async (data: CreateCadenciaRequest): Promise<Cadencia> => {
    const res = await api.post("/api/v1/cadencias", data);
    return res.data;
  },

  update: async (id: number, data: UpdateCadenciaRequest): Promise<Cadencia> => {
    const res = await api.put(`/api/v1/cadencias/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/cadencias/${id}`);
  },

  trigger: async (id: number): Promise<TriggerResult> => {
    const res = await api.post(`/api/v1/cadencias/${id}/trigger`);
    return res.data;
  },
};

export default cadenciaService;
