import { useLocation, useParams } from "react-router-dom";
import { AgentOption, AgentActionId, AgentPageContext } from "../types";
import { useAuth } from "./useAuth";

/**
 * Mapeamento de labels para cada action_id.
 * Centralizado aqui para não duplicar nos componentes.
 */
export const ACTION_LABELS: Record<AgentActionId, string> = {
  summarize_card:    "Resumir este negócio",
  suggest_next_steps:"Sugerir próximos passos",
  email_followup:    "Gerar e-mail de follow-up",
  email_proposal:    "Gerar e-mail de proposta",
  objection_handling:"Como lidar com objeções",
  analyze_pipeline:  "Analisar meu pipeline",
  quick_win_today:   "Quick win para hoje",
  cold_call_tips:    "Dicas de cold call",
  productivity_tips: "Dicas de produtividade",
  my_day_tasks:      "O que tenho para fazer hoje",
  how_was_my_day:    "Como foi meu dia hoje",
  // Serviço
  service_my_day:         "Minhas atividades de serviço hoje",
  service_recal_due:      "Recalibrações vencendo",
  service_stuck_cards:    "Meus cards parados",
  service_how_was_my_day: "Como foi meu dia (serviço)",
  service_summarize_card: "Resumir este card de serviço",
  service_collections:    "Cobranças a vencer / atrasadas",
};

/** Converte uma lista de action_ids em AgentOption[] usando os labels centralizados */
function toOptions(ids: AgentActionId[]): AgentOption[] {
  return ids.map((id) => ({ action_id: id, label: ACTION_LABELS[id] }));
}

// ---------------------------------------------------------------------------
// Opções por contexto × role — Vendedor
// ---------------------------------------------------------------------------
const SALESPERSON_OPTIONS: Record<AgentPageContext, AgentOption[]> = {
  // Dentro de um card: ações diretas sobre o negócio
  card_detail: toOptions([
    "summarize_card",
    "suggest_next_steps",
    "email_followup",
    "email_proposal",
    "objection_handling",
  ]),
  // Dentro de um board: visão do pipeline + rotina do dia
  board: toOptions([
    "my_day_tasks",
    "quick_win_today",
    "how_was_my_day",
    "analyze_pipeline",
  ]),
  // Página de clientes: prospecção e rotina
  clients: toOptions([
    "my_day_tasks",
    "cold_call_tips",
    "how_was_my_day",
  ]),
  // Qualquer outra página: rotina básica
  general: toOptions([
    "my_day_tasks",
    "how_was_my_day",
    "productivity_tips",
  ]),
};

// ---------------------------------------------------------------------------
// Opções por contexto × role — SDR
// (foco em prospecção: mais cold call, sem proposta comercial)
// ---------------------------------------------------------------------------
const SDR_OPTIONS: Record<AgentPageContext, AgentOption[]> = {
  // Dentro de um card: qualificação e primeiro contato
  card_detail: toOptions([
    "summarize_card",
    "suggest_next_steps",
    "email_followup",
    "cold_call_tips",
    "objection_handling",
  ]),
  // Dentro de um board: rotina do dia e prospecção (sem analyze_pipeline)
  board: toOptions([
    "my_day_tasks",
    "how_was_my_day",
    "cold_call_tips",
    "quick_win_today",
  ]),
  // Página de clientes: prospecção em destaque
  clients: toOptions([
    "my_day_tasks",
    "cold_call_tips",
    "how_was_my_day",
    "productivity_tips",
  ]),
  // Qualquer outra página: rotina + prospecção
  general: toOptions([
    "my_day_tasks",
    "how_was_my_day",
    "cold_call_tips",
    "productivity_tips",
  ]),
};

// ---------------------------------------------------------------------------
// Opções por contexto × role — Serviço (calibração / manutenção / cobrança)
// Lê dados do módulo de Serviço (não de Vendas).
// ---------------------------------------------------------------------------
const SERVICE_OPTIONS: Record<AgentPageContext, AgentOption[]> = {
  card_detail: toOptions([
    "service_summarize_card",
    "email_followup",
  ]),
  board: toOptions([
    "service_my_day",
    "service_stuck_cards",
    "service_recal_due",
    "service_how_was_my_day",
    "service_collections",
  ]),
  clients: toOptions([
    "service_my_day",
    "service_how_was_my_day",
  ]),
  general: toOptions([
    "service_my_day",
    "service_recal_due",
    "service_how_was_my_day",
  ]),
};

// ---------------------------------------------------------------------------
// Fallback para roles ainda não planejados (admin/manager — fase 2)
// ---------------------------------------------------------------------------
const DEFAULT_OPTIONS: Record<AgentPageContext, AgentOption[]> = {
  card_detail: toOptions(["summarize_card", "suggest_next_steps", "email_followup"]),
  board:       toOptions(["my_day_tasks", "how_was_my_day"]),
  clients:     toOptions(["my_day_tasks", "how_was_my_day"]),
  general:     toOptions(["my_day_tasks", "how_was_my_day"]),
};

/** Retorna as opções corretas para o role informado */
function getOptionsByRole(role: string | undefined): Record<AgentPageContext, AgentOption[]> {
  switch (role) {
    case "salesperson": return SALESPERSON_OPTIONS;
    case "sdr":         return SDR_OPTIONS;
    case "service":     return SERVICE_OPTIONS;
    default:            return DEFAULT_OPTIONS;
  }
}

// ---------------------------------------------------------------------------

interface AgentContext {
  pageContext: AgentPageContext;
  cardId: number | undefined;
  boardId: number | undefined;
  /** Lista completa de chips para o contexto + role atual. Nunca muda durante a sessão. */
  initialOptions: AgentOption[];
}

/**
 * Detecta o contexto da página e o role do usuário para retornar
 * a lista de chips correta para o Agent Growth.
 * A lista é fixa durante a sessão — chips usados são controlados no componente.
 */
export function useAgentContext(): AgentContext {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams<{ boardId?: string; cardId?: string }>();

  const cardId  = params.cardId  ? Number(params.cardId)  : undefined;
  const boardId = params.boardId ? Number(params.boardId) : undefined;

  // Determina o contexto com base na URL
  let pageContext: AgentPageContext = "general";

  if (cardId) {
    pageContext = "card_detail";
  } else if (boardId) {
    pageContext = "board";
  } else if (location.pathname.startsWith("/clients")) {
    pageContext = "clients";
  }
  // /boards sem :boardId (lista de boards) fica como "general" — sem board_id não há dados reais

  const optionsByContext = getOptionsByRole(user?.role);

  return {
    pageContext,
    cardId,
    boardId,
    initialOptions: optionsByContext[pageContext],
  };
}
