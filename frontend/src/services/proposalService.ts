import api from "./api";

export interface ProposalItem {
  id?: number;
  product_id?: number | null;
  description: string;
  sku?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  total?: number;
}

export type ProposalMarker = "aprovada" | "nao_aprovada" | "em_aberto";

// Card vinculado a uma proposta (relação N:N)
export interface LinkedCard {
  card_id: number;
  board_id?: number | null;
  status: "ganho" | "perdido" | "ativo";
  title?: string | null;
}

// Versão arquivada de uma proposta (histórico)
export interface ProposalVersion {
  id: number;
  version_number: number;
  changed_by?: string | null;
  created_at?: string | null;
  has_pdf: boolean;
  snapshot?: Record<string, unknown> | null;
}

// Endereço de entrega estruturado (usado na impressão/visualização — fase 2)
export interface DeliveryAddress {
  cep?: string;
  city?: string;
  state?: string;          // UF
  street?: string;         // Endereço (logradouro)
  district?: string;       // Bairro
  number?: string;         // Número
  complement?: string;     // Complemento
  state_registration?: string; // Inscrição estadual
  recipient?: string;      // Destinatário
  person_type?: "fisica" | "juridica";
  document?: string;       // CPF/CNPJ
  phone?: string;          // Fone
}

export interface Proposal {
  id: number;
  number: number;
  client_id?: number | null;
  person_id?: number | null;
  seller_name?: string | null;
  date?: string | null;
  next_contact_date?: string | null;
  intro?: string | null;
  other_items?: string | null;
  discount: number;
  shipping: number;
  shipping_method?: string | null;
  freight_type?: string | null;
  carrier_name?: string | null;
  payment_terms?: string | null;
  validity_days?: number | null;
  delivery_date?: string | null;
  delivery_desc?: string | null;
  different_delivery_address?: boolean;
  delivery_address?: DeliveryAddress | null;
  notes?: string | null;
  signature?: string | null;
  internal_status: string;
  items: ProposalItem[];
  total_items: number;
  total: number;
  marker: ProposalMarker;
  client_name?: string | null;
  client_document?: string | null;
  linked_cards: LinkedCard[];
  created_at?: string;
  updated_at?: string;
}

export interface ProposalListResponse {
  items: Proposal[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type ProposalCreate = Partial<
  Omit<Proposal, "id" | "number" | "items" | "total" | "total_items" | "marker" | "linked_cards">
> & {
  items: ProposalItem[];
  // Vínculo inicial opcional (usado no prefill / criação a partir de um card)
  service_card_id?: number | null;
};

const BASE = "/api/v1/proposals";

class ProposalService {
  async list(page = 1, pageSize = 50, search?: string): Promise<ProposalListResponse> {
    const r = await api.get<ProposalListResponse>(BASE, { params: { page, page_size: pageSize, search } });
    return r.data;
  }
  async get(id: number): Promise<Proposal> {
    return (await api.get<Proposal>(`${BASE}/${id}`)).data;
  }
  async create(data: ProposalCreate): Promise<Proposal> {
    return (await api.post<Proposal>(BASE, data)).data;
  }
  async update(id: number, data: Partial<ProposalCreate>): Promise<Proposal> {
    return (await api.put<Proposal>(`${BASE}/${id}`, data)).data;
  }
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }
  async prefillFromCard(serviceCardId: number): Promise<ProposalCreate> {
    return (await api.get<ProposalCreate>(`${BASE}/prefill/${serviceCardId}`)).data;
  }
  async listByCard(serviceCardId: number): Promise<Proposal[]> {
    return (await api.get<Proposal[]>(`${BASE}/by-card/${serviceCardId}`)).data;
  }
  async getPdf(id: number, download = false): Promise<Blob> {
    const r = await api.get(`${BASE}/${id}/pdf`, {
      params: download ? { download: 1 } : {},
      responseType: "blob",
    });
    return r.data as Blob;
  }
  async linkCard(id: number, cardId: number): Promise<Proposal> {
    return (await api.post<Proposal>(`${BASE}/${id}/cards`, { service_card_id: cardId })).data;
  }
  async unlinkCard(id: number, cardId: number): Promise<Proposal> {
    return (await api.delete<Proposal>(`${BASE}/${id}/cards/${cardId}`)).data;
  }
  async listVersions(id: number): Promise<ProposalVersion[]> {
    return (await api.get<ProposalVersion[]>(`${BASE}/${id}/versions`)).data;
  }
  async getVersionPdf(id: number, versionId: number, download = false): Promise<Blob> {
    const r = await api.get(`${BASE}/${id}/versions/${versionId}/pdf`, {
      params: download ? { download: 1 } : {},
      responseType: "blob",
    });
    return r.data as Blob;
  }
}

export default new ProposalService();
