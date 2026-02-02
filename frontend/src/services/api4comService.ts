import api from './api';

// ========== Interfaces ==========

export interface API4ComConfig {
  id: number;
  email: string;
  is_active: boolean;
  has_valid_token: boolean;
  token_expires_at: string | null;
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface API4ComConfigCreate {
  email: string;
  password: string;
}

export interface UserExtension {
  id: number;
  user_id: number;
  extension: string;
  is_active: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface UserExtensionCreate {
  user_id: number;
  extension: string;
}

export interface API4ComTestResponse {
  success: boolean;
  message: string;
  token_valid: boolean;
  error?: string;
}

// ========== Service ==========

const api4comService = {
  // ========== Config ==========

  /**
   * Retorna a configuração atual da API4COM
   */
  async getConfig(): Promise<API4ComConfig> {
    const response = await api.get('/api/v1/api4com/config');
    return response.data;
  },

  /**
   * Salva ou atualiza as credenciais da API4COM
   * Ao salvar, faz login automático e obtém o token
   */
  async saveConfig(data: API4ComConfigCreate): Promise<API4ComConfig> {
    const response = await api.post('/api/v1/api4com/config', data);
    return response.data;
  },

  /**
   * Testa a conexão com a API4COM usando o token atual
   */
  async testConnection(): Promise<API4ComTestResponse> {
    const response = await api.post('/api/v1/api4com/test');
    return response.data;
  },

  // ========== Extensions ==========

  /**
   * Lista todos os ramais vinculados aos vendedores
   */
  async listExtensions(): Promise<UserExtension[]> {
    const response = await api.get('/api/v1/api4com/extensions');
    return response.data;
  },

  /**
   * Vincula um vendedor a um ramal
   * Se já existir ramal para o vendedor, atualiza
   */
  async saveExtension(data: UserExtensionCreate): Promise<UserExtension> {
    const response = await api.post('/api/v1/api4com/extensions', data);
    return response.data;
  },

  /**
   * Remove o vínculo de ramal de um vendedor
   */
  async deleteExtension(userId: number): Promise<void> {
    await api.delete(`/api/v1/api4com/extensions/${userId}`);
  },

  // ========== Chamadas ==========

  /**
   * Inicia uma chamada telefônica
   */
  async makeCall(data: { phone: string; card_id: number }): Promise<{ success: boolean; message: string; call_log_id?: number; error?: string }> {
    const response = await api.post('/api/v1/api4com/call', data);
    return response.data;
  },
};

export default api4comService;
