import api from "./api";

/**
 * Tipos para o catálogo de Serviços (espelha productService).
 */
export interface Service {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  category?: string;
  is_active?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  sku?: string;
  unit_price?: number;
  category?: string;
  is_active?: boolean;
}

export interface ServiceListResponse {
  services: Service[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Serviço de catálogo de Serviços
 */
class ServiceCatalogService {
  /**
   * Cria um novo serviço no catálogo
   */
  async create(data: CreateServiceRequest): Promise<Service> {
    const response = await api.post<Service>("/api/v1/services", data);
    return response.data;
  }

  /**
   * Lista serviços com filtros
   */
  async list(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
  }): Promise<ServiceListResponse> {
    const response = await api.get<ServiceListResponse>("/api/v1/services", { params });
    return response.data;
  }

  /**
   * Busca um serviço por ID
   */
  async getById(id: number): Promise<Service> {
    const response = await api.get<Service>(`/api/v1/services/${id}`);
    return response.data;
  }

  /**
   * Atualiza um serviço
   */
  async update(id: number, data: UpdateServiceRequest): Promise<Service> {
    const response = await api.put<Service>(`/api/v1/services/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um serviço (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/services/${id}`);
  }
}

export default new ServiceCatalogService();
