import api from "./api";

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
}

const BASE = "/api/v1/service-boards";

class ServiceActivityService {
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

  async complete(boardId: number, cardId: number, id: number, isCompleted: boolean): Promise<ServiceCardActivity> {
    const r = await api.patch<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/${id}/complete`, { is_completed: isCompleted });
    return r.data;
  }

  async remove(boardId: number, cardId: number, id: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}/activities/${id}`);
  }

  async uploadFile(boardId: number, cardId: number, file: File): Promise<ServiceCardActivity> {
    const form = new FormData();
    form.append("file", file);
    const r = await api.post<ServiceCardActivity>(`${BASE}/${boardId}/cards/${cardId}/activities/files`, form, {
      headers: { "Content-Type": "multipart/form-data" },
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

export default new ServiceActivityService();
