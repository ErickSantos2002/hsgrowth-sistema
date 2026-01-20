import React from "react";
import { Calendar, User, DollarSign, Clock } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "../../types";

interface KanbanCardProps {
  card: Card;
  onClick?: () => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ card, onClick }) => {
  // Tornar o card draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-kanban-card
      onClick={onClick}
      className="bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 p-3 rounded-lg hover:bg-slate-800/90 hover:border-slate-600/60 transition-all cursor-move group touch-none"
    >
      {/* Título */}
      <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
        {card.title}
      </h4>

      {/* Badges de status e prioridade */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Valor */}
      {card.value && (
        <div className="flex items-center gap-1 mb-2">
          <DollarSign size={12} className="text-green-400" />
          <span className="text-green-400 text-xs font-semibold">
            R${" "}
            {card.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Cliente (do contact_info) */}
      {card.contact_info?.name && (
        <div className="flex items-center gap-1 mb-2">
          <User size={12} className="text-slate-400" />
          <span className="text-slate-400 text-xs truncate">
            {card.contact_info.name}
          </span>
        </div>
      )}

      {/* Footer: Data de vencimento e Responsável */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
        {/* Data de vencimento */}
        {card.due_date && (
          <div className="flex items-center gap-1">
            {(() => {
              const { text, isOverdue } = formatDueDate(card.due_date);
              return (
                <>
                  <Calendar
                    size={12}
                    className={isOverdue ? "text-red-400" : "text-slate-400"}
                  />
                  <span
                    className={`text-xs ${
                      isOverdue ? "text-red-400 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {text}
                  </span>
                </>
              );
            })()}
          </div>
        )}

        {/* Responsável (Avatar com iniciais) */}
        {card.assigned_to_name && (
          <div
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold"
            title={card.assigned_to_name}
          >
            {card.assigned_to_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
