import api from "./api";

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_by_id: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  body: string;
  is_active?: boolean;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  body?: string;
  is_active?: boolean;
}

class EmailTemplateService {
  async list(includeInactive = false): Promise<EmailTemplate[]> {
    const response = await api.get<EmailTemplate[]>("/api/v1/email-templates", {
      params: includeInactive ? { include_inactive: true } : {},
    });
    return response.data;
  }

  async create(data: CreateEmailTemplateRequest): Promise<EmailTemplate> {
    const response = await api.post<EmailTemplate>("/api/v1/email-templates", data);
    return response.data;
  }

  async update(id: number, data: UpdateEmailTemplateRequest): Promise<EmailTemplate> {
    const response = await api.put<EmailTemplate>(`/api/v1/email-templates/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/email-templates/${id}`);
  }
}

export default new EmailTemplateService();
