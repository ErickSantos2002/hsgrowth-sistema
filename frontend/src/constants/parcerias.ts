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

/** Cor da coluna/etapa: verde no fim do funil, vermelho no Perdido, azul no resto. */
export const corDaEtapa = (codigo: string) =>
  ["ativado", "ganho"].includes(codigo) ? COLORS.board.green
  : codigo === "perdido" ? COLORS.board.red
  : COLORS.board.blue;

// Perfis presos à seção Parcerias — o backend nega o resto do CRM a eles.
export const PERFIS_TRANCADOS = ["partner", "finance"];
export const PERFIS_PARCERIAS = ["admin", "manager", "finance", "partner"];
export const PERFIS_GESTAO = ["admin", "manager"];

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

export const TIPOS_ATIVIDADE = [
  { value: "nota", label: "Nota" },
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "tarefa", label: "Tarefa" },
];

export const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatarCnpj = (cnpj?: string | null) =>
  cnpj && cnpj.length === 14
    ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : cnpj || "";
