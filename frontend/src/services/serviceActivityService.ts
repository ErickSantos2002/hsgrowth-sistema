import api from "./api";
import api4comService from "./api4comService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityCategory = "atividade" | "anotacao" | "arquivo" | "alteracao";

export interface ServiceCardActivity {
  id: number;
  service_card_id: number;
  user_id?: number;
  user_name?: string;
  category: ActivityCategory;
  activity_type?: string;
  title?: string;
  description?: string;
  activity_metadata?: Record<string, any>;
  priority?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

/** Atividade de qualquer card que usa os componentes de Serviço (Serviço ou Parcerias). */
export type AtividadeCard = Omit<ServiceCardActivity, "service_card_id">;

/**
 * Operações que as abas Atividade, Anotações e Arquivos precisam.
 * Cada tipo de card entrega a sua (Serviço por board/card; Parcerias por parceiro/oportunidade).
 */
export interface AtividadesApi {
  create(data: CreateServiceActivityRequest): Promise<unknown>;
  update(id: number, data: UpdateServiceActivityRequest): Promise<unknown>;
  complete(id: number, isCompleted: boolean, isValid?: boolean | null): Promise<unknown>;
  remove(id: number): Promise<void>;
  uploadFile(file: File, slot?: string): Promise<unknown>;
  downloadFile(id: number, filename: string): Promise<void>;
  /** Ligação pelo API4Com. Sem ela, o Foco não mostra o botão de ligar. */
  call?(phone: string): Promise<{ success: boolean; error?: string; message?: string }>;
}

export interface CreateServiceActivityRequest {
  category: "atividade" | "anotacao";
  activity_type?: string;
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  activity_metadata?: Record<string, any>;
}

export interface UpdateServiceActivityRequest {
  title?: string;
  description?: string;
  activity_type?: string;
  priority?: string;
  due_date?: string;
  activity_metadata?: Record<string, any>;
}

// Item da visão geral de atividades de serviço (todos os cards/usuários)
export interface ServiceActivityOverviewItem {
  id: number;
  service_card_id: number;
  card_title: string;
  board_id: number;
  activity_type?: string;
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  created_at: string;
}

const BASE = "/api/v1/service-boards";

class ServiceActivityService {
  /** Lista as atividades de TODOS os cards de serviço (sem filtro por usuário).
   *  status: "pending" (padrão) | "completed" | "all" (usado pelo calendário). */
  async listAll(status: "pending" | "completed" | "all" = "pending"): Promise<ServiceActivityOverviewItem[]> {
    const r = await api.get<{ activities: ServiceActivityOverviewItem[]; total: number }>(
      `/api/v1/service-activities`,
      { params: { status } },
    );
    return r.data.activities;
  }

  async list(boardId: number, cardId: number): Promise<ServiceCardActivity[]> {
    const r = await api.get<ServiceCardActivity[]>(`${BASE}/${boardId}/cards/${cardId}/activities`);
    return r.data;
  }

  async create(boardId: number, cardId: number, data: CreateServiceActivityRequest): Promise<ServiceCardActivity> {
    const r = await api.post<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities`, data);
    return r.data;
  }

  async update(boardId: number, cardId: number, id: number, data: UpdateServiceActivityRequest): Promise<ServiceCardActivity> {
    const r = await api.put<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/${id}`, data);
    return r.data;
  }

  async complete(boardId: number, cardId: number, id: number, isCompleted: boolean, isValid?: boolean | null): Promise<ServiceCardActivity> {
    const r = await api.patch<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/${id}/complete`, { is_completed: isCompleted, is_valid: isValid ?? null });
    return r.data;
  }

  async remove(boardId: number, cardId: number, id: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}/activities/${id}`);
  }

  async uploadFile(boardId: number, cardId: number, file: File, slot?: string): Promise<ServiceCardActivity> {
    const form = new FormData();
    form.append("file", file);
    const r = await api.post<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/files`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      params: slot ? { slot } : undefined,
    });
    return r.data;
  }

  async downloadFile(boardId: number, cardId: number, id: number, filename: string): Promise<void> {
    const r = await api.get(`${BASE}/${boardId}/cards/${cardId}/activities/files/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

const serviceActivityService = new ServiceActivityService();

/** As operações de atividade de um card de Serviço, no formato que as abas usam. */
export const apiDoCardDeServico = (boardId: number, cardId: number): AtividadesApi => ({
  create: (data) => serviceActivityService.create(boardId, cardId, data),
  update: (id, data) => serviceActivityService.update(boardId, cardId, id, data),
  complete: (id, isCompleted, isValid) => serviceActivityService.complete(boardId, cardId, id, isCompleted, isValid),
  remove: (id) => serviceActivityService.remove(boardId, cardId, id),
  uploadFile: (file, slot) => serviceActivityService.uploadFile(boardId, cardId, file, slot),
  downloadFile: (id, filename) => serviceActivityService.downloadFile(boardId, cardId, id, filename),
  call: (phone) => api4comService.makeCall({ phone, service_card_id: cardId }),
});

export default serviceActivityService;
