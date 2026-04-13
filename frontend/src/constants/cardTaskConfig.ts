/**
 * Constantes e tipos compartilhados entre SchedulerSection e Calendar.
 * Centralizadas aqui para evitar duplicação e facilitar manutenção.
 */
import React from "react";
import {
  CheckSquare,
  Clock,
  Coffee,
  Mail,
  MoreHorizontal,
  Phone,
  Timer,
  Users,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TaskType = "call" | "meeting" | "task" | "follow_up" | "other" | "email" | "deadline" | "lunch";
export type Priority = "normal" | "high" | "urgent";

export interface TypeConfig {
  label: string;
  Icon: React.ElementType;
  pillBg: string;
  pillText: string;
  pillBorder: string;
}

// ─── Configuração de tipos de tarefa ─────────────────────────────────────────

export const TYPE_CONFIG: Record<TaskType, TypeConfig> = {
  call: {
    label: "Ligação",
    Icon: Phone,
    pillBg: "bg-blue-500/20",
    pillText: "text-slate-900 dark:text-blue-300",
    pillBorder: "border-blue-500/40",
  },
  meeting: {
    label: "Reunião",
    Icon: Users,
    pillBg: "bg-purple-500/20",
    pillText: "text-slate-900 dark:text-purple-300",
    pillBorder: "border-purple-500/40",
  },
  task: {
    label: "Tarefa",
    Icon: CheckSquare,
    pillBg: "bg-green-500/20",
    pillText: "text-slate-900 dark:text-green-300",
    pillBorder: "border-green-500/40",
  },
  follow_up: {
    label: "Follow Up",
    Icon: Clock,
    pillBg: "bg-yellow-500/20",
    pillText: "text-slate-900 dark:text-yellow-300",
    pillBorder: "border-yellow-500/40",
  },
  deadline: {
    label: "Prazo",
    Icon: Clock,
    pillBg: "bg-orange-500/20",
    pillText: "text-slate-900 dark:text-orange-300",
    pillBorder: "border-orange-500/40",
  },
  email: {
    label: "E-mail",
    Icon: Mail,
    pillBg: "bg-blue-500/20",
    pillText: "text-slate-900 dark:text-blue-300",
    pillBorder: "border-blue-500/40",
  },
  lunch: {
    label: "Almoço",
    Icon: Coffee,
    pillBg: "bg-purple-500/20",
    pillText: "text-slate-900 dark:text-purple-300",
    pillBorder: "border-purple-500/40",
  },
  other: {
    label: "Outro",
    Icon: MoreHorizontal,
    pillBg: "bg-slate-500/20",
    pillText: "text-slate-900 dark:text-slate-300",
    pillBorder: "border-slate-500/40",
  },
  email: {
    label: "E-mail",
    Icon: Mail,
    pillBg: "bg-orange-500/20",
    pillText: "text-slate-900 dark:text-orange-300",
    pillBorder: "border-orange-500/40",
  },
  deadline: {
    label: "Prazo",
    Icon: Timer,
    pillBg: "bg-red-500/20",
    pillText: "text-slate-900 dark:text-red-300",
    pillBorder: "border-red-500/40",
  },
  lunch: {
    label: "Almoço",
    Icon: Coffee,
    pillBg: "bg-amber-500/20",
    pillText: "text-slate-900 dark:text-amber-300",
    pillBorder: "border-amber-500/40",
  },
};

// ─── Configuração de prioridades ──────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; badgeClass: string }
> = {
  normal: {
    label: "Normal",
    badgeClass: "bg-blue-500/20 border border-blue-500/40 text-slate-900 dark:text-blue-300",
  },
  high: {
    label: "Alta",
    badgeClass:
      "bg-yellow-500/20 border border-yellow-500/40 text-slate-900 dark:text-yellow-300",
  },
  urgent: {
    label: "Urgente",
    badgeClass: "bg-red-500/20 border border-red-500/40 text-slate-900 dark:text-red-300",
  },
};

/** Cabeçalho dos dias da semana, iniciando no domingo */
export const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
