import React, { useState } from "react";
import { Calendar, User, DollarSign, Clock, CheckSquare } from "lucide-react";
import { Card } from "../../types";
import { UserAvatar } from "../common";
import CardActivitiesModal from "./CardActivitiesModal";

interface KanbanCardProps {
  card: Card;
  onClick?: () => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ card, onClick }) => {
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);

  /**
   * Formata a data de vencimento
   */
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isOverdue = date < now;

    return {
      text: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      isOverdue,
    };
  };

  /**
   * Retorna a cor do badge de status
   */
  const getStatusColor = () => {
    if (card.is_won) return "bg-green-500/20 text-green-400";
    if (card.is_lost) return "bg-red-500/20 text-red-400";
    return "bg-blue-500/20 text-blue-400";
  };

  /**
   * Retorna o texto do status
   */
  const getStatusText = () => {
    if (card.is_won) return "Ganho";
    if (card.is_lost) return "Perdido";
    return "Aberto";
  };

  return (
    <div
      data-kanban-card
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md dark:border-slate-700/30 dark:bg-white/5 dark:hover:border-slate-600 dark:hover:bg-white/10"
    >
      {/* Badge de atividades pendentes (canto superior direito) */}
      {card.pending_tasks_status && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if ((card.pending_tasks_count ?? 0) > 0) {
              setShowActivitiesModal(true);
            }
          }}
          className={`absolute right-3.5 top-3.5 rounded-full p-1.5 transition-all ${
            card.pending_tasks_status === "overdue"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : card.pending_tasks_status === "today"
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : card.pending_tasks_status === "future"
              ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              : "bg-gray-100 text-slate-400 cursor-default dark:bg-slate-700/40 dark:text-slate-500"
          }`}
          title={
            card.pending_tasks_status === "overdue"
              ? `${card.pending_tasks_count} atividade(s) atrasada(s)`
              : card.pending_tasks_status === "today"
              ? `${card.pending_tasks_count} atividade(s) para hoje`
              : card.pending_tasks_status === "future"
              ? `${card.pending_tasks_count} atividade(s) futura(s)`
              : "Sem atividades"
          }
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Título */}
      <h4 className="mb-2 line-clamp-2 pr-14 text-[15px] leading-snug text-slate-900 dark:text-white">
        {card.title}
      </h4>

      {/* Badges compactos no topo (só mostrar se relevante) */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {/* Badge de status (só se ganho ou perdido) */}
        {(card.is_won || card.is_lost) && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor()}`}
          >
            {getStatusText()}
          </span>
        )}

        {/* Data de vencimento compacta */}
        {card.due_date && (
          <div className="flex items-center gap-0.5">
            {(() => {
              const { text, isOverdue } = formatDueDate(card.due_date);
              return (
                <span
                  className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
                    isOverdue
                      ? "bg-red-500/20 font-medium text-red-400"
                      : "bg-gray-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                  }`}
                >
                  <Calendar size={10} />
                  {text}
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer: Valor e Responsável */}
      <div className="flex items-center justify-between text-xs">
        {/* Valor compacto */}
        {card.value ? (
          <span className="font-medium text-green-400">
            R$ {card.value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        ) : (
          <span></span>
        )}

        {/* Avatares dos responsáveis (SDR à esquerda, Vendedor à direita) */}
        <div className="flex items-center gap-1">
          {card.sdr_name && (
            <UserAvatar
              userId={card.sdr_id || undefined}
              userName={card.sdr_name}
              avatarUrl={card.sdr_avatar_url}
              size="xs"
              className="shrink-0"
            />
          )}
          {card.assigned_to_name && (
            <UserAvatar
              userId={card.assigned_to_id || undefined}
              userName={card.assigned_to_name}
              avatarUrl={card.assigned_to_avatar_url}
              size="xs"
              className="shrink-0"
            />
          )}
        </div>
      </div>

      {/* Modal de atividades */}
      {showActivitiesModal && (
        <CardActivitiesModal
          cardId={card.id}
          cardTitle={card.title}
          onClose={() => setShowActivitiesModal(false)}
        />
      )}
    </div>
  );
};

export default KanbanCard;
