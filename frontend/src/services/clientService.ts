/**
 * Client Service - Serviço para gerenciamento de clientes
 * Responsável por todas as operações relacionadas a clientes
 */
import api from "./api";

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  document?: string; // CPF ou CNPJ
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  notes?: string;
  source?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;

  // Campos do blueprint da consultora
  cnae?: string;
  linkedin_url?: string;
  relationship_type?: string;
  commercial_activity?: string;
  sector?: string;
  employee_count?: string;
  annual_revenue?: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  document?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;

  // Campos do blueprint da consultora
  cnae?: string;
  linkedin_url?: string;
  relationship_type?: string;
  commercial_activity?: string;
  sector?: string;
  employee_count?: string;
  annual_revenue?: string;
}

export interface UpdateClientRequest {
  name?: string;
  // Campos opcionais aceitam null para permitir limpeza de valores existentes
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  notes?: string | null;
  is_active?: boolean;

  // Campos do blueprint da consultora
  cnae?: string | null;
  linkedin_url?: string | null;
  relationship_type?: string | null;
  commercial_activity?: string | null;
  sector?: string | null;
  employee_count?: string | null;
  annual_revenue?: string | null;
}

/**
 * Lista todos os clientes com filtros e paginação
 */
const list = async (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  state?: string;
}): Promise<ClientListResponse> => {
  const response = await api.get("/api/v1/clients", { params });
  return response.data;
};

/**
 * Busca um cliente por ID
 */
const getById = async (id: number): Promise<Client> => {
  const response = await api.get(`/api/v1/clients/${id}`);
  return response.data;
};

/**
 * Cria um novo cliente
 */
const create = async (data: CreateClientRequest): Promise<Client> => {
  const response = await api.post("/api/v1/clients", data);
  return response.data;
};

/**
 * Atualiza um cliente existente
 */
const update = async (id: number, data: UpdateClientRequest): Promise<Client> => {
  const response = await api.put(`/api/v1/clients/${id}`, data);
  return response.data;
};

/**
 * Deleta um cliente (soft delete)
 */
const remove = async (id: number): Promise<void> => {
  await api.delete(`/api/v1/clients/${id}`);
};

const clientService = {
  list,
  getById,
  create,
  update,
  delete: remove,
};

export default clientService;
