import api from "./api";
import type { ModoAcesso, StatusAcesso, ConviteResposta } from "./acessosService";
import type { AtividadeCard, AtividadesApi } from "./serviceActivityService";

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
  contract_date?: string | null;
  /** Só gestão e o próprio dono veem. */
  pix_key?: string | null;
  /** Só gestão; tem de ser um hunter. */
  indicated_by_partner_id?: number | null;
}

export interface Parceiro extends ParceiroForm {
  id: number;
  name: string;
  hs_owner_name?: string | null;
  activation_evidence?: string | null;
  activated_at?: string | null;
  activation_opportunity_id?: number | null;
  /** Anexo do contrato (no histórico do card). */
  contract_activity_id?: number | null;
  contract_file_name?: string | null;
  stage: string;
  position: number;
  loss_reason?: string | null;
  loss_detail?: string | null;
  lost_at?: string | null;
  /** "empresa" (parceiro comum) ou "hunter". */
  kind?: "empresa" | "hunter";
  cpf?: string | null;
  indicated_by_partner_id?: number | null;
  indicated_by_name?: string | null;
  terms_accepted_at?: string | null;
  blocked_at?: string | null;
  created_at: string;
  updated_at: string;
  oportunidades_por_etapa: Record<string, number>;
  /** Só na lista do board: atividades em aberto. */
  pending_status?: "overdue" | "today" | "future" | "none" | null;
  pending_count?: number;
}

export interface Membro {
  id: number;
  partner_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  /** Login do vendedor (null = sem login). */
  user_id?: number | null;
  status_acesso?: StatusAcesso | null;
  /** Validade do último convite (só com convite pendente ou expirado). */
  convite_expira_em?: string | null;
}

export interface Acesso {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at?: string | null;
  status_acesso: StatusAcesso;
  convite_expira_em?: string | null;
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
  cnpj_justificativa?: string | null;
  global_discount?: number;
  global_discount_type?: "value" | "percent";
  shipping?: number;
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
  /** Ganho marcado pelo parceiro e confirmado por admin, gerente ou Financeiro. */
  won_confirmed_at?: string | null;
  won_confirmed_by_name?: string | null;
  // Cliente e Pessoa do CRM ligados pela empresa/contato (só a H&S recebe).
  client_id?: number | null;
  client_name?: string | null;
  person_id?: number | null;
  person_name?: string | null;
  lost_at?: string | null;
  total_value: number;
  global_discount: number;
  global_discount_type: "value" | "percent";
  shipping: number;
  cnpj_resultado?: "verde" | "amarelo" | "vermelho" | null;
  cnpj_motivo?: string | null;
  cnpj_justificativa?: string | null;
  cnpj_liberado_por_name?: string | null;
  /** Só na lista do board: atividades em aberto. */
  pending_status?: "overdue" | "today" | "future" | "none" | null;
  pending_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ItemProduto {
  id: number;
  product_id: number;
  product_name: string;
  product_sku?: string | null;
  quantity: number;
  unit_price: number;
  /** Desconto da linha, sempre em R$. */
  discount: number;
  subtotal: number;
  total: number;
}

export interface ProdutoCatalogo {
  id: number;
  name: string;
  sku?: string | null;
  unit_price: number;
}

/** Atividade de parceiro ou oportunidade: mesmo formato do card de Serviço. */
export type Atividade = AtividadeCard & { partner_id?: number | null; opportunity_id?: number | null };

/** De quem são as atividades: o card do parceiro (board 1) ou a oportunidade (board 2). */
export type AlvoAtividades = { tipo: "parceiro" | "oportunidade"; id: number };

const rotaDoAlvo = (alvo: AlvoAtividades) =>
  `${BASE}/${alvo.tipo === "parceiro" ? "parceiros" : "oportunidades"}/${alvo.id}/atividades`;

export interface MoverPayload {
  stage: string;
  position?: number;
  loss_reason?: string;
  loss_detail?: string;
  expected_close_date?: string;
  modality?: "venda" | "locacao";
}

/** Mensagem do backend (trava 422, 403, validação do Pydantic) para o toast. */
export interface RegistroSemaforo {
  tipo: "card" | "oportunidade";
  id: number;
  titulo: string;
  onde: string;
  responsavel?: string | null;
  cnpj: string;
  motivo: string;
  libera_em?: string | null;
  parceiro?: string | null;
  desde: string;
}

export interface ConsultaCnpj {
  cnpj: string;
  resultado: "verde" | "amarelo" | "vermelho";
  motivo: string;
  frase: string;
  libera_em?: string | null;
  registros: RegistroSemaforo[];
}

export interface ResumoConsultas {
  hoje: number;
  limite: number | null;
  ultimos_30_dias: number;
  verdes: number;
  amarelos: number;
  vermelhos: number;
}

export interface ConsultaHistoricoItem {
  id: number;
  created_at: string;
  user_name?: string | null;
  perfil?: string | null;
  partner_name?: string | null;
  cnpj: string;
  resultado: string;
  motivo: string;
}

export interface FiltroHistorico {
  user_id?: number;
  partner_id?: number;
  desde?: string;
  ate?: string;
  pagina?: number;
}

export type AudienceTermos = "empresa" | "hunter";

export interface TermosPendentes {
  pendente: boolean;
  version?: number;
  text?: string;
}

export interface Termos {
  id: number;
  audience: AudienceTermos;
  version: number;
  text: string;
  published_at: string;
  published_by_id?: number | null;
}

export interface IndicacaoForm {
  name: string;
  cnpj: string;
  main_contact_name: string;
  main_contact_email: string;
  main_contact_phone?: string;
  pix_key?: string;
}

export interface IndicacaoResposta {
  parceiro: Parceiro;
  email_enviado: boolean;
}

export interface HunterForm {
  name: string;
  /** Exatamente um entre cpf e cnpj. */
  cpf?: string;
  cnpj?: string;
  email: string;
  phone?: string;
  pix_key?: string;
  modo?: ModoAcesso;
  password?: string;
}

export interface Hunter {
  id: number;
  name: string;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  pix_key?: string | null;
  stage: string;
  terms_accepted_at?: string | null;
  created_at: string;
  empresas_indicadas: number;
  status_acesso?: StatusAcesso | null;
  convite_expira_em?: string | null;
}

// ─── Comissões ───────────────────────────────────────────────────────────────
// Dinheiro e percentuais chegam como string (Decimal): converter com Number() para exibir.
export type TipoComissao = "venda_propria" | "indicacao" | "bonus_primeira_venda" | "calibracao";
export type SituacaoComissao = "pendente" | "paga" | "cancelada";

/** Regras da Consulta de CNPJ (Configurações → Consulta de CNPJ, só admin altera). */
export interface RegrasCnpj {
  protection_days: number;
  recent_purchase_days: number;
  recent_loss_days: number;
  daily_query_limit: number;
  block_between_sellers: boolean;
  updated_at?: string | null;
  updated_by_name?: string | null;
}

export interface ComissaoConfig {
  /** Venda própria da empresa; a do hunter é `hunter_own_sale_pct`. */
  own_sale_pct: string;
  hunter_own_sale_pct: string;
  indication_pct: string;
  first_sale_bonus: string;
  indication_months: number;
  calibration_pct: string;
  /** Anuidade usada só na previsão das renovações. */
  annual_fee_reference: string;
  updated_at?: string | null;
}

export interface ComissaoConfigForm {
  own_sale_pct: number;
  hunter_own_sale_pct: number;
  indication_pct: number;
  first_sale_bonus: number;
  indication_months: number;
  calibration_pct: number;
  annual_fee_reference: number;
}

/** Uma faixa de desconto e quanto ela paga por aparelho (valores nulos sem produto liberado). */
export interface LinhaTabelaDesconto {
  desconto: number;
  cliente_paga: string | null;
  taxa_empresa: string;
  valor_empresa: string | null;
  taxa_hunter: string;
  valor_hunter: string | null;
}

export interface TabelaDesconto {
  preco_referencia: string | null;
  linhas: LinhaTabelaDesconto[];
  renovacao_prevista: string | null;
}

export interface Comissao {
  id: number;
  beneficiary_partner_id: number;
  beneficiary_name?: string | null;
  source_partner_id: number;
  source_name?: string | null;
  opportunity_id: number;
  opportunity_title?: string | null;
  calibration_id?: number | null;
  kind: TipoComissao;
  base_value: string;
  rate?: string | null;
  fixed_value?: string | null;
  amount: string;
  status: SituacaoComissao;
  created_at: string;
  paid_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

export interface ComissaoResumo {
  pendente: string;
  pago: string;
  cancelado: string;
}

export interface APagarBeneficiario {
  beneficiary_partner_id: number;
  nome: string;
  kind: string;
  documento?: string | null;
  pix_key?: string | null;
  total: string;
  quantidade: number;
  lancamentos: Comissao[];
}

export interface PagarResposta {
  quantidade: number;
  total: string;
  ignorados: number;
}

export interface FiltroComissoes {
  status?: SituacaoComissao;
  beneficiario?: number;
  de?: string;
  ate?: string;
}

export interface Calibracao {
  id: number;
  opportunity_id: number;
  serial_number: string;
  calibration_date: string;
  value: string;
  created_at: string;
  commission_amount?: string | null;
  /** Situação da comissão e qual recorrência do aparelho ela é (1 ou 2); vazios se não gerou comissão. */
  commission_status?: "pendente" | "paga" | null;
  commission_paid_at?: string | null;
  recorrencia?: number | null;
}

/** Uma das 2 renovações do aparelho: data prevista e, se já lançada, a calibração. */
export interface RenovacaoPrevista {
  ordem: number;
  prevista_para: string;
  valor_previsto: string | null;
  calibracao: Calibracao | null;
}

export interface AparelhoDaOportunidade {
  numero: number;
  serial_number: string | null;
  renovacoes: RenovacaoPrevista[];
}

export interface CalibracoesDaOportunidade {
  aparelhos: AparelhoDaOportunidade[];
  sem_comissao: Calibracao[];
}

export interface CalibracaoForm {
  serial_number: string;
  calibration_date: string;
  value: number;
}

// ─── Dashboard de Parcerias ──────────────────────────────────────────────────
// Dinheiro chega como string ("1234.50"): Number() só para exibir.
export interface DashVendas { quantidade: number; valor: string }
export interface DashMes { mes: string; quantidade: number; valor: string }
export interface DashPorVendedor { membro_id?: number | null; nome: string; quantidade: number; valor: string }
export interface DashCarteiraItem {
  partner_id: number;
  nome: string;
  situacao: string;
  quantidade: number;
  valor: string;
  ultima_venda_em?: string | null;
  ultima_atividade_em?: string | null;
  dias_parada?: number | null;
  parada: boolean;
}
export interface DashCarteiraHunterItem extends DashCarteiraItem { prazo_indicacao_ate?: string | null }
export interface DashComissaoTipo { pendente: string; pago: string }
export interface DashComissoes { pendente: string; pago: string; por_tipo: Record<string, DashComissaoTipo> }
export interface DashVendedor { visao: "vendedor"; vendas: DashVendas; serie: DashMes[] }
export interface DashEmpresa {
  visao: "empresa"; vendas: DashVendas; serie: DashMes[];
  por_vendedor: DashPorVendedor[]; unidades: DashCarteiraItem[]; comissoes: DashComissoes;
}
export interface DashHunter {
  visao: "hunter"; vendas: DashVendas; carteira_vendas: DashVendas; serie: DashMes[];
  carteira: DashCarteiraHunterItem[]; comissoes: DashComissoes;
}
export interface DashRankingEmpresa { partner_id: number; nome: string; situacao: string; quantidade: number; valor: string }
export interface DashRankingHunter { partner_id: number; nome: string; empresas: number; quantidade: number; valor: string }
export interface DashHS {
  visao: "hs"; vendas: DashVendas; serie: DashMes[];
  ranking_empresas: DashRankingEmpresa[]; ranking_hunters: DashRankingHunter[];
  paradas: DashCarteiraItem[]; comissoes: DashComissoes;
}
export type DashboardParcerias = DashVendedor | DashEmpresa | DashHunter | DashHS;
export interface DashFiltroItem { id: number; nome: string }
export interface DashFiltros { hunters: DashFiltroItem[]; empresas: DashFiltroItem[] }
export interface FiltroDashboard { de?: string; ate?: string; hunter_id?: number; partner_id?: number }

export function mensagemDeErro(err: any, padrao: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, "");
  // Trava de CNPJ em Vendas: {code, message, pode_liberar}.
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
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
  async criarAcesso(id: number, dados: { name: string; email: string; modo: ModoAcesso; password?: string }) {
    return (await api.post<Acesso & { email_enviado: boolean }>(`${BASE}/parceiros/${id}/acessos`, dados)).data;
  },
  async darAcessoAoMembro(id: number, membroId: number, dados: { modo: ModoAcesso; password?: string }) {
    return (await api.post<ConviteResposta>(`${BASE}/parceiros/${id}/equipe/${membroId}/acesso`, dados)).data;
  },
  urlConviteAcesso(id: number, userId: number) {
    return `${BASE}/parceiros/${id}/acessos/${userId}/convite`;
  },
  urlConviteMembro(id: number, membroId: number) {
    return `${BASE}/parceiros/${id}/equipe/${membroId}/acesso/convite`;
  },
  async alterarAcesso(id: number, userId: number, isActive: boolean) {
    return (await api.put<Acesso>(`${BASE}/parceiros/${id}/acessos/${userId}`, { is_active: isActive })).data;
  },

  async bloquear(id: number) {
    return (await api.post<Parceiro>(`${BASE}/parceiros/${id}/bloquear`)).data;
  },
  async desbloquear(id: number) {
    return (await api.post<Parceiro>(`${BASE}/parceiros/${id}/desbloquear`)).data;
  },

  // Termos do Programa
  async termosPendentes() {
    return (await api.get<TermosPendentes>(`${BASE}/termos/pendente`)).data;
  },
  async aceitarTermos() {
    return (await api.post<{ ok: boolean; stage: string; terms_accepted_at: string }>(`${BASE}/termos/aceitar`)).data;
  },
  async listarTermos(audience: AudienceTermos) {
    return (await api.get<Termos[]>(`${BASE}/termos`, { params: { audience } })).data;
  },
  async publicarTermos(audience: AudienceTermos, text: string) {
    return (await api.post<Termos>(`${BASE}/termos`, { audience, text })).data;
  },

  // Indicações e hunters
  async indicar(dados: IndicacaoForm) {
    return (await api.post<IndicacaoResposta>(`${BASE}/indicacoes`, dados)).data;
  },
  async listarIndicacoes() {
    return (await api.get<Parceiro[]>(`${BASE}/indicacoes`)).data;
  },
  async criarHunter(dados: HunterForm) {
    return (await api.post<ConviteResposta>(`${BASE}/hunters`, dados)).data;
  },
  async painelParcerias(filtro: FiltroDashboard = {}) {
    const params = Object.fromEntries(Object.entries(filtro).filter(([, v]) => v !== undefined && v !== ""));
    return (await api.get<DashboardParcerias>(`${BASE}/dashboard`, { params })).data;
  },
  async filtrosDashboard() {
    return (await api.get<DashFiltros>(`${BASE}/dashboard/filtros`)).data;
  },
  async listarHunters() {
    return (await api.get<Hunter[]>(`${BASE}/hunters`)).data;
  },
  async reenviarConviteHunter(id: number, enviar: boolean) {
    return (await api.post<ConviteResposta>(`${BASE}/hunters/${id}/convite`, { enviar })).data;
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
  async confirmarGanho(id: number, acao: "confirmar" | "negar", motivo?: string) {
    return (await api.put<Oportunidade>(`${BASE}/oportunidades/${id}/ganho`, { acao, motivo })).data;
  },
  async anexarContrato(partnerId: number, arquivo: File) {
    const form = new FormData();
    form.append("file", arquivo);
    return (await api.post<Parceiro>(`${BASE}/parceiros/${partnerId}/contrato`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data;
  },
  async listarProdutos(id: number) {
    return (await api.get<ItemProduto[]>(`${BASE}/oportunidades/${id}/produtos`)).data;
  },
  async adicionarProduto(id: number, dados: { product_id: number; quantity: number; unit_price?: number }) {
    return (await api.post<ItemProduto>(`${BASE}/oportunidades/${id}/produtos`, dados)).data;
  },
  async atualizarProduto(id: number, itemId: number, dados: { quantity?: number; unit_price?: number; discount?: number }) {
    return (await api.put<ItemProduto>(`${BASE}/oportunidades/${id}/produtos/${itemId}`, dados)).data;
  },
  async removerProduto(id: number, itemId: number) {
    await api.delete(`${BASE}/oportunidades/${id}/produtos/${itemId}`);
  },
  async catalogo(busca: string) {
    return (await api.get<ProdutoCatalogo[]>(`${BASE}/produtos`, { params: { busca } })).data;
  },

  // Atividades
  async listarAtividades(alvo: AlvoAtividades) {
    return (await api.get<Atividade[]>(rotaDoAlvo(alvo))).data;
  },

  // Consulta de CNPJ (Entrega 2)
  async consultarCnpj(cnpj: string) {
    return (await api.post<ConsultaCnpj>(`${BASE}/consulta-cnpj`, { cnpj })).data;
  },
  async resumoConsultas() {
    return (await api.get<ResumoConsultas>(`${BASE}/consulta-cnpj/resumo`)).data;
  },
  async historicoConsultas(filtro: FiltroHistorico) {
    return (await api.get<{ total: number; itens: ConsultaHistoricoItem[] }>(`${BASE}/consulta-cnpj/historico`, { params: filtro })).data;
  },
  // Comissões
  async lerConfigComissoes() {
    return (await api.get<ComissaoConfig>(`${BASE}/comissoes/config`)).data;
  },
  async lerRegrasCnpj() {
    return (await api.get<RegrasCnpj>(`${BASE}/consulta-cnpj/regras`)).data;
  },
  async salvarRegrasCnpj(dados: Partial<RegrasCnpj>) {
    return (await api.put<RegrasCnpj>(`${BASE}/consulta-cnpj/regras`, dados)).data;
  },
  async salvarConfigComissoes(dados: ComissaoConfigForm) {
    return (await api.put<ComissaoConfig>(`${BASE}/comissoes/config`, dados)).data;
  },
  async listarComissoes(filtro: FiltroComissoes = {}) {
    return (await api.get<Comissao[]>(`${BASE}/comissoes`, { params: filtro })).data;
  },
  async resumoComissoes(filtro: Omit<FiltroComissoes, "status"> = {}) {
    return (await api.get<ComissaoResumo>(`${BASE}/comissoes/resumo`, { params: filtro })).data;
  },
  async comissoesAPagar(filtro: { de?: string; ate?: string } = {}) {
    return (await api.get<APagarBeneficiario[]>(`${BASE}/comissoes/a-pagar`, { params: filtro })).data;
  },
  /** Baixa o CSV pelo cliente autenticado (a rota exige o Bearer) e salva como arquivo. */
  async baixarAPagarCsv(filtro: { de?: string; ate?: string } = {}) {
    const r = await api.get<Blob>(`${BASE}/comissoes/a-pagar.csv`, { params: filtro, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissoes-a-pagar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  /** Paga exatamente os lançamentos informados (o que o Financeiro viu na tela). */
  async pagarComissoes(ids: number[]) {
    return (await api.post<PagarResposta>(`${BASE}/comissoes/pagar`, { ids })).data;
  },
  async listarCalibracoes(oportunidadeId: number) {
    return (await api.get<CalibracoesDaOportunidade>(`${BASE}/oportunidades/${oportunidadeId}/calibracoes`)).data;
  },
  async tabelaDesconto() {
    return (await api.get<TabelaDesconto>(`${BASE}/comissoes/tabela-desconto`)).data;
  },
  async lancarCalibracao(oportunidadeId: number, dados: CalibracaoForm) {
    return (await api.post<Calibracao>(`${BASE}/oportunidades/${oportunidadeId}/calibracoes`, dados)).data;
  },
  async avisoParceriasDoCard(cardId: number) {
    return (await api.get<{ parceiro: string; desde: string }[]>(`/api/v1/cards/${cardId}/aviso-parcerias`)).data;
  },
};

export default parceriasService;

/** Operações das abas Atividade, Anotações e Arquivos (componentes de Serviço) para Parcerias. Sem ligação. */
export const apiDeAtividades = (alvo: AlvoAtividades): AtividadesApi => ({
  create: async (data) => (await api.post(rotaDoAlvo(alvo), data)).data,
  update: async (id, data) => (await api.put(`${BASE}/atividades/${id}`, data)).data,
  complete: async (id, isCompleted, isValid) =>
    (await api.patch(`${BASE}/atividades/${id}/concluir`, { is_completed: isCompleted, is_valid: isValid ?? null })).data,
  remove: async (id) => {
    await api.delete(`${BASE}/atividades/${id}`);
  },
  uploadFile: async (file) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post(`${rotaDoAlvo(alvo)}/arquivos`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  downloadFile: async (id, filename) => {
    const r = await api.get(`${BASE}/atividades/${id}/arquivo`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
});
