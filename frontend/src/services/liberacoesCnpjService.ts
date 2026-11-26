import api from "./api";

/**
 * Pedidos de liberação de CNPJ em Vendas (1.11.32).
 * Vendedor e SDR pedem; admin e gerente liberam ou recusam.
 * Backend: app/api/v1/endpoints/liberacoes_cnpj.py.
 */
const BASE = "/api/v1/parcerias/liberacoes-cnpj";

export type TipoDeLiberacao = "criar_card" | "vincular_empresa" | "reabrir_card" | "clonar_card";
export type SituacaoDaLiberacao = "pendente" | "liberado" | "recusado" | "cancelado";

/** Nome do tipo na lista ("Criar card") e na frase da decisão ("pediu para criar um card da empresa X"). */
export const TIPOS_DE_LIBERACAO: Record<TipoDeLiberacao, { nome: string; acao: string }> = {
  criar_card: { nome: "Criar card", acao: "criar um card da empresa" },
  vincular_empresa: { nome: "Vincular ao card", acao: "vincular ao card dele a empresa" },
  reabrir_card: { nome: "Reabrir card perdido", acao: "resgatar um card perdido da empresa" },
  clonar_card: { nome: "Clonar card", acao: "clonar um card da empresa" },
};

export interface PedidoDeLiberacao {
  kind: TipoDeLiberacao;
  /** Reabrir e clonar: o backend usa a empresa do card de origem. */
  client_id: number;
  reason: string;
  /** criar_card: os dados do card. reabrir_card: título e detalhamento do canal. */
  payload?: Record<string, unknown>;
  /** vincular_empresa: o card dela. reabrir_card/clonar_card: o card de origem. */
  card_id?: number;
}

export interface Liberacao {
  id: number;
  kind: TipoDeLiberacao;
  status: SituacaoDaLiberacao;
  client_id: number | null;
  empresa: string;
  cnpj: string;
  card_id: number | null;
  titulo_do_card: string | null;
  reason: string;
  blocked_with: string;
  requested_by_id: number;
  solicitante: string | null;
  decided_by_id: number | null;
  decisor: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

/** Uma página da lista (1.11.33). O backend manda 10 por página. */
export interface PaginaDeLiberacoes {
  total: number;
  itens: Liberacao[];
}

export const LIBERACOES_POR_PAGINA = 10;

const liberacoesCnpjService = {
  async pedir(dados: PedidoDeLiberacao) {
    return (await api.post<Liberacao>(BASE, dados)).data;
  },
  async listar(situacao: SituacaoDaLiberacao | undefined, pagina: number) {
    const params = situacao ? { situacao, pagina } : { pagina };
    return (await api.get<PaginaDeLiberacoes>(BASE, { params })).data;
  },
  async contarPendentes() {
    return (await api.get<{ total: number }>(`${BASE}/pendentes/contagem`)).data.total;
  },
  async liberar(id: number, nota?: string) {
    return (await api.post<Liberacao>(`${BASE}/${id}/liberar`, { nota: nota || null })).data;
  },
  async recusar(id: number, nota: string) {
    return (await api.post<Liberacao>(`${BASE}/${id}/recusar`, { nota })).data;
  },
  async cancelar(id: number) {
    return (await api.post<Liberacao>(`${BASE}/${id}/cancelar`)).data;
  },
};

export default liberacoesCnpjService;
