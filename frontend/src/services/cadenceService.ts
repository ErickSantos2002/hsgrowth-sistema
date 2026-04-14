/**
 * Service para o sistema de Cadência por Lead Individual.
 * Gerencia templates (admin/gerente) e instâncias de cadência por card (SDR/Vendedor).
 */
import api from "./api";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CadenceStep {
  id: number;
  template_id: number;
  order: number;
  day_offset: number;
  activity_type: string;
  title: string;
  description: string | null;
  priority: "normal" | "high" | "urgent";
}

export interface CadenceTemplate {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
  steps: CadenceStep[];
}

export interface CadenceStepInput {
  order: number;
  day_offset: number;
  activity_type: string;
  title: string;
  description?: string;
  priority: "normal" | "high" | "urgent";
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  is_active: boolean;
  steps: CadenceStepInput[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  steps?: CadenceStepInput[];
}

export type CardCadenceStatus = "active" | "paused" | "completed" | "cancelled";

export interface CardCadence {
  id: number;
  card_id: number;
  template_id: number;
  template_name: string;
  started_by_id: number | null;
  status: CardCadenceStatus;
  current_step_order: number;
  total_steps: number;
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
  current_step: CadenceStep | null;
  previous_step: CadenceStep | null;
}

// ─── Labels e cores por tipo de atividade ─────────────────────────────────────

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  task: "Tarefa",
  meeting: "Reunião",
  follow_up: "Follow Up",
  deadline: "Prazo",
  other: "Outro",
};

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "call", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "task", label: "Tarefa" },
  { value: "meeting", label: "Reunião" },
  { value: "follow_up", label: "Follow Up" },
  { value: "other", label: "Outro" },
];

// ─── API ──────────────────────────────────────────────────────────────────────

const cadenceService = {
  // Templates
  listTemplates: async (onlyActive = false): Promise<CadenceTemplate[]> => {
    const res = await api.get("/api/v1/cadences/templates", {
      params: { only_active: onlyActive },
    });
    return res.data;
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<CadenceTemplate> => {
    const res = await api.post("/api/v1/cadences/templates", data);
    return res.data;
  },

  updateTemplate: async (id: number, data: UpdateTemplateRequest): Promise<CadenceTemplate> => {
    const res = await api.put(`/api/v1/cadences/templates/${id}`, data);
    return res.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/cadences/templates/${id}`);
  },

  // Cadência por card
  getCardCadence: async (cardId: number): Promise<CardCadence | null> => {
    try {
      const res = await api.get(`/api/v1/cadences/cards/${cardId}`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  startCadence: async (cardId: number, templateId: number): Promise<CardCadence> => {
    const res = await api.post(`/api/v1/cadences/cards/${cardId}/start`, {
      template_id: templateId,
    });
    return res.data;
  },

  pauseCadence: async (cardId: number): Promise<CardCadence> => {
    const res = await api.post(`/api/v1/cadences/cards/${cardId}/pause`);
    return res.data;
  },

  resumeCadence: async (cardId: number): Promise<CardCadence> => {
    const res = await api.post(`/api/v1/cadences/cards/${cardId}/resume`);
    return res.data;
  },

  cancelCadence: async (cardId: number): Promise<CardCadence> => {
    const res = await api.post(`/api/v1/cadences/cards/${cardId}/cancel`);
    return res.data;
  },
};

export default cadenceService;
