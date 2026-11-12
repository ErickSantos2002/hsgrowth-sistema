import { Handshake, Trello, type LucideIcon } from "lucide-react";
import { COLORS } from "./colors";

// Os dois boards de Parcerias (fixos, mesma cara dos boards de Vendas e de Serviços).
export interface BoardParceria {
  chave: "aquisicao" | "oportunidades";
  nome: string;
  descricao: string;
  cor: string;
  icone: LucideIcon;
  caminho: string;
}

export const BOARDS_PARCERIAS: BoardParceria[] = [
  {
    chave: "aquisicao",
    nome: "Aquisição de Parceiros",
    descricao: "Da prospecção até a ativação de cada parceiro.",
    cor: COLORS.board.green,
    icone: Handshake,
    caminho: "/parcerias/aquisicao",
  },
  {
    chave: "oportunidades",
    nome: "Pipeline de Parceiros",
    descricao: "As oportunidades que os parceiros registram.",
    cor: COLORS.board.blue,
    icone: Trello,
    caminho: "/parcerias/oportunidades",
  },
];

/** As situações do board de Aquisição (mudam sozinhas ou pelo botão Bloquear; o backend manda a lista em /etapas). */
export const ETAPAS_AQUISICAO = [
  { codigo: "potencial", nome: "Potencial", cor: COLORS.board.gray },
  { codigo: "convidado", nome: "Convidado", cor: COLORS.board.amber },
  { codigo: "ativado", nome: "Ativado", cor: COLORS.board.green },
  { codigo: "bloqueado", nome: "Bloqueado", cor: COLORS.board.red },
];

/** Cor da coluna/etapa: as situações de Aquisição têm cor própria; no Pipeline, verde no Ganho, vermelho no Perdido, azul no resto. */
export const corDaEtapa = (codigo: string) =>
  ETAPAS_AQUISICAO.find((e) => e.codigo === codigo)?.cor
  ?? (codigo === "ganho" ? COLORS.board.green
  : codigo === "perdido" ? COLORS.board.red
  : COLORS.board.blue);

// Perfis presos à seção Parcerias — o backend nega o resto do CRM a eles.
export const PERFIS_TRANCADOS = ["partner", "partner_member", "hunter", "finance"];
// O vendedor entra, mas só vê os parceiros dos quais é o Responsável H&S (o backend filtra).
export const PERFIS_PARCERIAS = ["admin", "manager", "finance", "partner", "partner_member", "hunter", "salesperson"];
/** Lado do parceiro: o dono, um vendedor da equipe dele ou o hunter (que não tem equipe). */
export const PERFIS_DO_PARCEIRO = ["partner", "partner_member", "hunter"];
/** Quem indica empresas ao Programa. */
export const PERFIS_QUE_INDICAM = ["partner", "hunter"];
export const PERFIS_GESTAO = ["admin", "manager"];
/** Veem a página de Comissões (parceiro e hunter só as próprias; gestão e Financeiro, tudo). */
export const PERFIS_COMISSOES = ["admin", "manager", "finance", "partner", "hunter"];
export const PERFIS_COMISSOES_TUDO = ["admin", "manager", "finance"];
// Quem mexe nos cards que enxerga (o Financeiro só acompanha).
export const PERFIS_QUE_EDITAM = ["admin", "manager", "partner", "partner_member", "hunter", "salesperson"];
// Quem pode ser escolhido como Responsável H&S — é opcional.
export const PERFIS_RESPONSAVEL_HS = ["admin", "manager", "salesperson"];

export const QUALIFICACAO_OPCOES = [
  { value: "aderente", label: "Aderente" },
  { value: "parcialmente_aderente", label: "Parcialmente aderente" },
  { value: "nao_aderente", label: "Não aderente" },
];

export const EVIDENCIA_LABEL: Record<string, string> = {
  oportunidade_validada: "Oportunidade validada",
  proposta_enviada: "Proposta enviada",
  primeira_venda: "Primeira venda",
};

export const ELEGIBILIDADE_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  validada: "Validada",
  rejeitada: "Rejeitada",
};

export const ELEGIBILIDADE_COR: Record<string, string> = {
  em_analise: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  validada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejeitada: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatarCnpj = (cnpj?: string | null) =>
  cnpj && cnpj.length === 14
    ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : cnpj || "";

// Consulta de CNPJ: o SDR consulta mesmo sem ver os boards de Parcerias.
export const PERFIS_CONSULTA_CNPJ = ["admin", "manager", "salesperson", "sdr", "partner", "partner_member", "hunter"];

export const SEMAFORO_COR: Record<string, string> = {
  verde: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amarelo: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  vermelho: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

export const SEMAFORO_LABEL: Record<string, string> = {
  verde: "Livre", amarelo: "Para análise", vermelho: "Bloqueado",
};

export const MOTIVO_SEMAFORO: Record<string, string> = {
  livre: "Livre", em_negociacao: "Em negociação", compra_recente: "Compra recente",
  perdida_recente: "Perdida há pouco", outra_unidade: "Outra unidade",
};

export const COMISSAO_TIPO_LABEL: Record<string, string> = {
  venda_propria: "Venda própria",
  indicacao: "Indicação",
  bonus_primeira_venda: "Bônus 1ª venda",
  calibracao: "Calibração",
};

export const COMISSAO_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", paga: "Paga", cancelada: "Cancelada",
};

/** Calibrações com comissão por aparelho (nº de série); igual a LIMITE_CALIBRACOES no backend. */
export const LIMITE_CALIBRACOES = 2;

export const COMISSAO_STATUS_COR: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paga: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

/** Percentual vindo como string do backend, com vírgula ("7.50" -> "7,5%"). */
export const formatarPercentual = (valor?: string | number | null) =>
  valor == null ? "" : `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
