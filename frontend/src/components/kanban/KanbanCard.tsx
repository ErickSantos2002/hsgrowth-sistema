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
      className="bg-white/5 hover:bg-white/10 border border-slate-700/30 hover:border-slate-600 p-3.5 rounded-lg transition-all cursor-pointer group shadow-sm hover:shadow-md"
    >
      {/* Título */}
      <h4 className="text-white text-[15px] mb-2 line-clamp-2 leading-snug">
        {card.title}
      </h4>

      {/* Badges compactos no topo (só mostrar se relevante) */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {/* Badge de status (só se ganho ou perdido) */}
        {(card.is_won || card.is_lost) && (
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${getStatusColor()}`}
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
                  className={`px-1.5 py-0.5 text-[10px] rounded flex items-center gap-0.5 ${
                    isOverdue
                      ? "bg-red-500/20 text-red-400 font-medium"
                      : "bg-slate-700/50 text-slate-400"
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
          <span className="text-green-400 font-medium">
            R$ {card.value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        ) : (
          <span></span>
        )}

        {/* Avatar do responsável (menor e mais discreto) */}
        {card.assigned_to_name && (
          <div
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-semibold"
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
