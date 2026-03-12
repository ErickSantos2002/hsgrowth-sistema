import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { CardTask } from "../../services/cardTaskService";
import StatusBadge from "../cardDetails/StatusBadge";
import { formatBrazilDateTime, getActivityStatusBrazil } from "../../utils/timezone";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../../constants/cardTaskConfig";

interface ActivityCardProps {
  task: CardTask;
  onNavigateToCard: (cardId: number) => void;
}

/**
 * Card individual para exibição de uma atividade na listagem da página Atividades.
 *
 * Exibe apenas informações — ações (Concluir, Reagendar, Excluir) ficam
 * disponíveis exclusivamente dentro do FocusMode ("Iniciar Atividades").
 */
const ActivityCard: React.FC<ActivityCardProps> = ({ task, onNavigateToCard }) => {
  const typeConfig = TYPE_CONFIG[task.task_type] ?? TYPE_CONFIG.other;
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const activityStatus = task.due_date ? getActivityStatusBrazil(task.due_date) : "future";

  /** Cor da borda esquerda conforme prioridade */
  const getBorderColor = () => {
    if (task.priority === "urgent") return "border-l-red-500";
    if (task.priority === "high") return "border-l-yellow-500";
    return "border-l-transparent";
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 border-l-4 bg-white transition-all hover:border-gray-300 dark:border-slate-700/60 dark:bg-slate-900/50 dark:hover:border-slate-600 ${getBorderColor()}`}
    >
      <div className="p-4">
        {/* Header: ícone + título + badges */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-slate-500 dark:text-slate-400">
            <typeConfig.Icon size={16} />
          </span>

          <p className="min-w-0 flex-1 font-medium text-slate-900 dark:text-white">
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${typeConfig.pillBg} ${typeConfig.pillText} ${typeConfig.pillBorder}`}
            >
              {typeConfig.label}
            </span>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${priorityConfig.badgeClass}`}
            >
              {priorityConfig.label}
            </span>
          </div>
        </div>

        {/* Status + data + responsável */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {task.due_date && <StatusBadge status={activityStatus} />}
          {task.due_date && <span>{formatBrazilDateTime(task.due_date)}</span>}
          {task.assigned_to_name && (
            <>
              <span>•</span>
              <span>{task.assigned_to_name}</span>
            </>
          )}
        </div>

        {/* Linha de contexto: Card e Cliente com link */}
        {(task.card_title || task.card_client_name) && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {task.card_title && (
              <Link
                to={`/cards/${task.card_id}`}
                onClick={() => onNavigateToCard(task.card_id)}
                className="flex items-center gap-1 text-blue-500 transition-colors hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink size={11} />
                {task.card_title}
              </Link>
            )}
            {task.card_title && task.card_client_name && <span>•</span>}
            {task.card_client_name && <span>{task.card_client_name}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;
