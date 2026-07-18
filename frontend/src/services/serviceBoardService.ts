import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceBoard {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  lists_count?: number;
  cards_count?: number;
}

export interface ServiceBoardListResponse {
  boards: ServiceBoard[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ServiceList {
  id: number;
  board_id: number;
  name: string;
  color?: string;
  position: number;
  is_done_stage: boolean;
  is_lost_stage: boolean;
  created_at: string;
  updated_at: string;
  cards_count?: number;
}

// Informações de negócio do Resumo (herdadas de Vendas + específicas de Serviço)
export interface ServiceBusinessInfo {
  seller_name?: string;            // Vendedor responsável (só leitura / informativo)
  deal_type?: string;              // Tipo de Negócio (ex: Nova Venda)
  acquisition_channel?: string;    // Canal de Aquisição (ex: Inbound)
  acquisition_channel_detail?: string; // Detalhamento
  modality?: "venda" | "locacao" | ""; // É venda ou locação
  should_invoice?: boolean | null; // Deve ser faturado? (aluguel)
  // Cobrança (board 2): tipo de cobrança — aparelhos já atrasados ou a vencer
  collection_type?: "a_vencer" | "atrasados" | "";
  // Triagem (etapa Oportunidade Existente)
  service_type?: "recalibracao" | "manutencao" | "ambos" | ""; // Recalibração e/ou Manutenção
  device_received?: boolean | null; // Aparelho recebido pela expedição?
  // Proposta
  form_answered?: boolean | null; // Formulário de Coleta de Dados preenchido (trava p/ Operações)
  // Fechamento (etapa Proposta): define se vai por Faturamento direto (dá Ganho)
  // ou por Pedido (avança para Aguardando Pedido).
  closing_type?: "faturamento_direto" | "pedido" | ""; // Forma de fechamento
  // Aparelhos do cliente vindos do sistema externo GestorHS (somente leitura).
  // Ver ServiceDevicesSection — não confundir com `aparelhos` de ServiceCardProduct,
  // que é preenchido pelo laboratório por produto vendido.
  equipamentos?: ServiceBusinessInfoEquipamento[] | null;
}

// 1 aparelho do cliente informado pelo GestorHS via business_info.equipamentos.
// Todos os campos são opcionais e podem vir null — a qualidade de dados da origem é ruim.
export interface ServiceBusinessInfoEquipamento {
  serial_number?: string | null;
  model?: string | null;
  alcohol_module?: string | null;
  next_recalibration_date?: string | null;
}

export interface ServiceCard {
  id: number;
  list_id: number;
  title: string;
  description?: string;
  assigned_to_id?: number;
  due_date?: string;
  contact_info?: Record<string, any>;
  payment_info?: Record<string, any>;
  business_info?: ServiceBusinessInfo;
  client_id?: number;
  person_id?: number;
  client_name?: string;
  person_name?: string;
  assigned_to_name?: string;
  value?: number;
  pending_status?: "overdue" | "today" | "future" | "none";
  pending_count?: number;
  is_stuck_3d?: boolean;
  is_stuck_7d?: boolean;
  collaborators?: { id: number; name: string }[];
  products?: { id: number; name: string }[];
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// 1 aparelho de um produto — dados preenchidos pelo laboratório por unidade
export interface ServiceAparelho {
  serial_number?: string;        // Nº de Série [Laboratório]
  model?: string;                // Modelo [Laboratório]
  alcohol_module?: string;       // Módulo de álcool [Laboratório]
  next_recalibration_date?: string; // Data de próxima recalibragem (YYYY-MM-DD) [Laboratório]
}

export interface ServiceCardProduct {
  id: number;
  service_card_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  notes?: string;
  aparelhos?: ServiceAparelho[];
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
}

export interface ServiceCardProductSummary {
  items: ServiceCardProduct[];
  total_items: number;
  subtotal: number;
  total_discount: number;
  total: number;
}

export interface CreateServiceCardProductRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}

export interface UpdateServiceCardProductRequest {
  quantity?: number;
  unit_price?: number;
  discount?: number;
  notes?: string;
  aparelhos?: ServiceAparelho[];
}

// ─── Serviço vinculado ao card (catálogo de Serviços) ──────────────────────────

export interface ServiceCardService {
  id: number;
  service_card_id: number;
  service_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  notes?: string;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at?: string;
  service_name?: string;
  service_sku?: string;
  service_category?: string;
}

export interface ServiceCardServiceSummary {
  items: ServiceCardService[];
  total_items: number;
  subtotal: number;
  total_discount: number;
  total: number;
}

export interface CreateServiceCardServiceRequest {
  service_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}

export interface UpdateServiceCardServiceRequest {
  quantity?: number;
  unit_price?: number;
  discount?: number;
  notes?: string;
}

export interface ServiceCardListResponse {
  cards: ServiceCard[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateServiceBoardRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateServiceBoardRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_deleted?: boolean;
}

export interface CreateServiceListRequest {
  board_id: number;
  name: string;
  color?: string;
  position?: number;
  is_done_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface UpdateServiceListRequest {
  name?: string;
  color?: string;
  position?: number;
  is_done_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface CreateServiceCardRequest {
  list_id: number;
  title: string;
  description?: string;
  assigned_to_id?: number;
  due_date?: string;
  contact_info?: Record<string, any>;
  client_id?: number | null;
  person_id?: number | null;
}

export interface UpdateServiceCardRequest {
  title?: string;
  description?: string;
  list_id?: number;
  assigned_to_id?: number;
  due_date?: string | null;
  contact_info?: Record<string, any>;
  payment_info?: Record<string, any> | null;
  business_info?: ServiceBusinessInfo | null;
  client_id?: number | null;
  person_id?: number | null;
  position?: number;
  is_deleted?: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/service-boards";

class ServiceBoardService {
  // Boards
  async list(params?: { is_deleted?: boolean; page?: number; page_size?: number }): Promise<ServiceBoardListResponse> {
    const r = await api.get<ServiceBoardListResponse>(BASE, { params });
    return r.data;
  }

  async getById(id: number): Promise<ServiceBoard> {
    const r = await api.get<ServiceBoard>(`${BASE}/${id}`);
    return r.data;
  }

  async create(data: CreateServiceBoardRequest): Promise<ServiceBoard> {
    const r = await api.post<ServiceBoard>(BASE, data);
    return r.data;
  }

  async update(id: number, data: UpdateServiceBoardRequest): Promise<ServiceBoard> {
    const r = await api.put<ServiceBoard>(`${BASE}/${id}`, data);
    return r.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  async duplicate(id: number, newName: string, copyLists = true): Promise<ServiceBoard> {
    const r = await api.post<ServiceBoard>(`${BASE}/${id}/duplicate`, {
      new_name: newName,
      copy_lists: copyLists,
    });
    return r.data;
  }

  // Lists
  async getLists(boardId: number): Promise<ServiceList[]> {
    const r = await api.get<ServiceList[]>(`${BASE}/${boardId}/lists`);
    return r.data;
  }

  async createList(boardId: number, data: CreateServiceListRequest): Promise<ServiceList> {
    const r = await api.post<ServiceList>(`${BASE}/${boardId}/lists`, data);
    return r.data;
  }

  async updateList(boardId: number, listId: number, data: UpdateServiceListRequest): Promise<ServiceList> {
    const r = await api.put<ServiceList>(`${BASE}/${boardId}/lists/${listId}`, data);
    return r.data;
  }

  async deleteList(boardId: number, listId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/lists/${listId}`);
  }

  async moveList(boardId: number, listId: number, newPosition: number): Promise<ServiceList> {
    const r = await api.put<ServiceList>(`${BASE}/${boardId}/lists/${listId}/move`, { new_position: newPosition });
    return r.data;
  }

  // Cards
  async getCards(boardId: number, page = 1, pageSize = 200): Promise<ServiceCardListResponse> {
    const r = await api.get<ServiceCardListResponse>(`${BASE}/${boardId}/cards`, {
      params: { page, page_size: pageSize },
    });
    return r.data;
  }

  async getCard(boardId: number, cardId: number): Promise<ServiceCard> {
    const r = await api.get<ServiceCard>(`${BASE}/${boardId}/cards/${cardId}`);
    return r.data;
  }

  async createCard(boardId: number, data: CreateServiceCardRequest): Promise<ServiceCard> {
    const r = await api.post<ServiceCard>(`${BASE}/${boardId}/cards`, data);
    return r.data;
  }

  async updateCard(boardId: number, cardId: number, data: UpdateServiceCardRequest): Promise<ServiceCard> {
    const r = await api.put<ServiceCard>(`${BASE}/${boardId}/cards/${cardId}`, data);
    return r.data;
  }

  async deleteCard(boardId: number, cardId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}`);
  }

  async moveCard(boardId: number, cardId: number, listId: number, position?: number): Promise<ServiceCard> {
    const r = await api.put<ServiceCard>(`${BASE}/${boardId}/cards/${cardId}/move`, {
      list_id: listId,
      position,
    });
    return r.data;
  }

  // Card Products
  async getCardProducts(boardId: number, cardId: number): Promise<ServiceCardProductSummary> {
    const r = await api.get<ServiceCardProductSummary>(`${BASE}/${boardId}/cards/${cardId}/products`);
    return r.data;
  }

  async addCardProduct(boardId: number, cardId: number, data: CreateServiceCardProductRequest): Promise<ServiceCardProduct> {
    const r = await api.post<ServiceCardProduct>(`${BASE}/${boardId}/cards/${cardId}/products`, data);
    return r.data;
  }

  async updateCardProduct(boardId: number, cardId: number, itemId: number, data: UpdateServiceCardProductRequest): Promise<ServiceCardProduct> {
    const r = await api.put<ServiceCardProduct>(`${BASE}/${boardId}/cards/${cardId}/products/${itemId}`, data);
    return r.data;
  }

  async removeCardProduct(boardId: number, cardId: number, itemId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}/products/${itemId}`);
  }

  // Card Services (catálogo de Serviços)
  async getCardServices(boardId: number, cardId: number): Promise<ServiceCardServiceSummary> {
    const r = await api.get<ServiceCardServiceSummary>(`${BASE}/${boardId}/cards/${cardId}/services`);
    return r.data;
  }

  async addCardService(boardId: number, cardId: number, data: CreateServiceCardServiceRequest): Promise<ServiceCardService> {
    const r = await api.post<ServiceCardService>(`${BASE}/${boardId}/cards/${cardId}/services`, data);
    return r.data;
  }

  async updateCardService(boardId: number, cardId: number, itemId: number, data: UpdateServiceCardServiceRequest): Promise<ServiceCardService> {
    const r = await api.put<ServiceCardService>(`${BASE}/${boardId}/cards/${cardId}/services/${itemId}`, data);
    return r.data;
  }

  async removeCardService(boardId: number, cardId: number, itemId: number): Promise<void> {
    await api.delete(`${BASE}/${boardId}/cards/${cardId}/services/${itemId}`);
  }
}

export default new ServiceBoardService();
