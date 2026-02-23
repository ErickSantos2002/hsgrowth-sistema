import React from "react";

export type ActivityStatus = "overdue" | "today" | "tomorrow" | "future" | "completed";

interface StatusBadgeProps {
  status: ActivityStatus;
  date?: string; // Para status "future", exibe a data
}

/**
 * Badge de status para atividades
 * Cores e textos diferentes conforme o status
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, date }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "overdue":
        return {
          text: "VENCIDO",
          className: "bg-red-500/20 text-red-400 border-red-500/50",
        };
      case "today":
        return {
          text: "HOJE",
          className: "bg-green-500/20 text-green-400 border-green-500/50",
        };
      case "tomorrow":
        return {
          text: "AMANHÃ",
          className: "bg-purple-500/20 text-purple-400 border-purple-500/50",
        };
      case "completed":
        return {
          text: "CONCLUÍDO",
          className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
        };
      case "future":
        return {
          text: date || "FUTURO",
          className: "bg-purple-500/20 text-purple-400 border-purple-500/50",
        };
      default:
        return {
          text: "PENDENTE",
          className: "bg-slate-500/20 text-slate-400 dark:text-slate-500 dark:text-slate-400 border-slate-500/50",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex min-w-[80px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-bold ${config.className}`}
    >
      {config.text}
    </span>
  );
};

export default StatusBadge;
