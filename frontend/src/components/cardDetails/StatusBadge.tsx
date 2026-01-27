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
          className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
        };
      case "tomorrow":
        return {
          text: "AMANHÃ",
          className: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        };
      case "completed":
        return {
          text: "CONCLUÍDO",
          className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
        };
      case "future":
        return {
          text: date || "FUTURO",
          className: "bg-slate-500/20 text-slate-400 border-slate-500/50",
        };
      default:
        return {
          text: "PENDENTE",
          className: "bg-slate-500/20 text-slate-400 border-slate-500/50",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${config.className}`}
    >
      {config.text}
    </span>
  );
};

export default StatusBadge;
