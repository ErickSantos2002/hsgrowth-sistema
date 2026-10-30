import api from "./api";

const BASE = "/api/v1/parcerias";

export interface Etapa {
  codigo: string;
  nome: string;
}

export interface EtapasParcerias {
  aquisicao: Etapa[];
  oportunidades: Etapa[];
}

export interface ParceiroForm {
  name?: string;
  cnpj?: string | null;
  main_contact_name?: string | null;
  main_contact_phone?: string | null;
  main_contact_email?: string | null;
  partner_type?: string | null;
  origin?: string | null;
  segment?: string | null;
  region?: string | null;
  hs_owner_id?: number | null;
  qualification_status?: string | null;
  onboarding_date?: string | null;
}

export interface Parceiro extends ParceiroForm {
  id: number;
  name: string;
  hs_owner_name?: string | null;
  activation_evidence?: string | null;
  activated_at?: string | null;
  activation_opportunity_id?: number | null;
  stage: string;
  position: number;
  loss_reason?: string | null;
  loss_detail?: string | null;
  lost_at?: string | null;
  created_at: string;
  updated_at: string;
  oportunidades_por_etapa: Record<string, number>;
}

export interface Membro {
  id: number;
  partner_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
}

export interface Acesso {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface OportunidadeForm {
  partner_id?: number | null;
  seller_member_id?: number | null;
  title?: string;
  deal_type?: string;
  sector?: string;
  relationship_type?: string;
  context?: string;
  cnpj?: string;
  company_name?: string;
  company_segment?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  expected_close_date?: string | null;
  modality?: "venda" | "locacao" | null;
}

export interface Oportunidade {
  id: number;
  partner_id: number;
  partner_name?: string | null;
  acquisition_channel: string;
  seller_member_id?: number | null;
  seller_name?: string | null;
  title: string;
  deal_type: string;
  sector: string;
  relationship_type: string;
  context: string;
  cnpj: string;
  company_name: string;
  company_segment?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  eligibility_status: string;
  eligibility_note?: string | null;
  eligibility_by_name?: string | null;
  eligibility_at?: string | null;
  expected_close_date?: string | null;
  modality?: "venda" | "locacao" | null;
  loss_reason?: string | null;
  loss_detail?: string | null;
  stage: string;
  position: number;
  last_activity_at?: string | null;
  won_at?: string | null;
  lost_at?: string | null;
  total_value: number;
  created_at: string;
  updated_at: string;
}

export interface ItemProduto {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ProdutoCatalogo {
  id: number;
  name: string;
  sku?: string | null;
  unit_price: number;
}

export interface Atividade {
  id: number;
  partner_id?: number | null;
  opportunity_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  type: string;
  description: string;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface NovaAtividade {
  type: string;
  description: string;
  due_at?: string;
}

export interface MoverPayload {
  stage: string;
  position?: number;
  loss_reason?: string;
  loss_detail?: string;
  expected_close_date?: string;
  modality?: "venda" | "locacao";
}

/** Mensagem do backend (trava 422, 403, validação do Pydantic) para o toast. */
export function mensagemDeErro(err: any, padrao: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, "");
  return padrao;
}

const parceriasService = {
  async etapas() {
    return (await api.get<EtapasParcerias>(`${BASE}/etapas`)).data;
  },

  // Board 1
  async listarParceiros() {
    return (await api.get<Parceiro[]>(`${BASE}/parceiros`)).data;
  },
  async buscarParceiro(id: number) {
    return (await api.get<Parceiro>(`${BASE}/parceiros/${id}`)).data;
  },
  async criarParceiro(dados: ParceiroForm) {
    return (await api.post<Parceiro>(`${BASE}/parceiros`, dados)).data;
  },
  async atualizarParceiro(id: number, dados: ParceiroForm) {
    return (await api.put<Parceiro>(`${BASE}/parceiros/${id}`, dados)).data;
  },
  async moverParceiro(id: number, payload: MoverPayload) {
    return (await api.put<Parceiro>(`${BASE}/parceiros/${id}/mover`, payload)).data;
  },
  async listarEquipe(id: number) {
    return (await api.get<Membro[]>(`${BASE}/parceiros/${id}/equipe`)).data;
  },
  async criarMembro(id: number, dados: { name: string; email?: string; phone?: string }) {
    return (await api.post<Membro>(`${BASE}/parceiros/${id}/equipe`, dados)).data;
  },
  async atualizarMembro(id: number, membroId: number, dados: Partial<Membro>) {
    return (await api.put<Membro>(`${BASE}/parceiros/${id}/equipe/${membroId}`, dados)).data;
  },
  async listarAcessos(id: number) {
    return (await api.get<Acesso[]>(`${BASE}/parceiros/${id}/acessos`)).data;
  },
  async criarAcesso(id: number, dados: { name: string; email: string; password: string }) {
    return (await api.post<Acesso>(`${BASE}/parceiros/${id}/acessos`, dados)).data;
  },
  async alterarAcesso(id: number, userId: number, isActive: boolean) {
    return (await api.put<Acesso>(`${BASE}/parceiros/${id}/acessos/${userId}`, { is_active: isActive })).data;
  },

  // Board 2
  async listarOportunidades(partnerId?: number) {
    const params = partnerId ? { partner_id: partnerId } : undefined;
    return (await api.get<Oportunidade[]>(`${BASE}/oportunidades`, { params })).data;
  },
  async buscarOportunidade(id: number) {
    return (await api.get<Oportunidade>(`${BASE}/oportunidades/${id}`)).data;
  },
  async criarOportunidade(dados: OportunidadeForm) {
    return (await api.post<Oportunidade>(`${BASE}/oportunidades`, dados)).data;
  },
  async atualizarOportunidade(id: number, dados: OportunidadeForm) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}`, dados)).data;
  },
  async moverOportunidade(id: number, payload: MoverPayload) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}/mover`, payload)).data;
  },
  async definirElegibilidade(id: number, status: string, note?: string) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}/elegibilidade`, { status, note })).data;
  },
  async listarProdutos(id: number) {
    return (await api.get<ItemProduto[]>(`${BASE}/oportunidades/${id}/produtos`)).data;
  },
  async adicionarProduto(id: number, dados: { product_id: number; quantity: number; unit_price?: number }) {
    return (await api.post<ItemProduto>(`${BASE}/oportunidades/${id}/produtos`, dados)).data;
  },
  async atualizarProduto(id: number, itemId: number, dados: { quantity?: number; unit_price?: number }) {
    return (await api.put<ItemProduto>(`${BASE}/oportunidades/${id}/produtos/${itemId}`, dados)).data;
  },
  async removerProduto(id: number, itemId: number) {
    await api.delete(`${BASE}/oportunidades/${id}/produtos/${itemId}`);
  },
  async catalogo(busca: string) {
    return (await api.get<ProdutoCatalogo[]>(`${BASE}/produtos`, { params: { busca } })).data;
  },

  // Atividades
  async atividadesDoParceiro(id: number) {
    return (await api.get<Atividade[]>(`${BASE}/parceiros/${id}/atividades`)).data;
  },
  async criarAtividadeDoParceiro(id: number, dados: NovaAtividade) {
    return (await api.post<Atividade>(`${BASE}/parceiros/${id}/atividades`, dados)).data;
  },
  async atividadesDaOportunidade(id: number) {
    return (await api.get<Atividade[]>(`${BASE}/oportunidades/${id}/atividades`)).data;
  },
  async criarAtividadeDaOportunidade(id: number, dados: NovaAtividade) {
    return (await api.post<Atividade>(`${BASE}/oportunidades/${id}/atividades`, dados)).data;
  },
  async concluirAtividade(id: number, isCompleted: boolean) {
    return (await api.patch<Atividade>(`${BASE}/atividades/${id}/concluir`, { is_completed: isCompleted })).data;
  },
  async excluirAtividade(id: number) {
    await api.delete(`${BASE}/atividades/${id}`);
  },
};

export default parceriasService;
