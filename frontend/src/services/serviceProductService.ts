/**
 * Catálogo de EQUIPAMENTOS do módulo de Serviços.
 *
 * Separado do catálogo de Vendas (`productService`) de propósito: aqui ficam os
 * aparelhos do cliente que estão em serviço (bafômetros, módulos de calibração),
 * lá fica o que a empresa vende (bocais, bobinas, tampas). A maior parte destas
 * entradas nasce sozinha, criada pela integração com o GestorHS a partir do
 * modelo do aparelho.
 */
import api from "./api";

// baseURL do axios é a raiz do backend; o prefixo /api/v1 vai aqui, como nos
// outros serviços (ex.: productService usa "/api/v1/products").
const BASE = "/api/v1/service-products";

export interface ServiceProduct {
  id: number;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  is_active: boolean;
  /** Preenchido quando veio de um sistema externo (ex.: "gestorhs"). */
  external_source?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceProductCreate {
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  is_active?: boolean;
}

class ServiceProductService {
  async list(params?: {
    search?: string;
    is_active?: boolean;
    limit?: number;
  }): Promise<ServiceProduct[]> {
    const r = await api.get<ServiceProduct[]>(BASE, { params });
    return r.data;
  }

  async create(data: ServiceProductCreate): Promise<ServiceProduct> {
    const r = await api.post<ServiceProduct>(BASE, data);
    return r.data;
  }

  async update(id: number, data: Partial<ServiceProductCreate>): Promise<ServiceProduct> {
    const r = await api.put<ServiceProduct>(`${BASE}/${id}`, data);
    return r.data;
  }
}

export default new ServiceProductService();
