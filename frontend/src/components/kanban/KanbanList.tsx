import React, { useLayoutEffect, useRef, useState } from "react";
import { Plus, MoreVertical, Edit, Archive, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { List, Card } from "../../types";
import KanbanCard from "./KanbanCard";

interface KanbanListProps {
  list: List;
  cards: Card[];
  onAddCard?: () => void;
  onEditList?: () => void;
  onArchiveList?: () => void;
  onDeleteList?: () => void;
  onCardClick?: (card: Card) => void;
}

const KanbanList: React.FC<KanbanListProps> = ({
  list,
  cards,
  onAddCard,
  onEditList,
  onArchiveList,
  onDeleteList,
  onCardClick,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(undefined);
  const cardsContainerRef = useRef<HTMLDivElement | null>(null);

  // Tornar a lista droppable
  const { setNodeRef } = useDroppable({
    id: `droppable-list-${list.id}`,
  });

  // IDs dos cards para o SortableContext
  const cardIds = cards.map((card) => card.id);

  useLayoutEffect(() => {
    if (!cardsContainerRef.current) return;
    const firstCard = cardsContainerRef.current.querySelector<HTMLElement>("[data-kanban-card]");
    if (!firstCard) {
      setListMaxHeight(undefined);
      return;
    }

    const cardHeight = Math.ceil(firstCard.getBoundingClientRect().height);
    const gap = 12;
    setListMaxHeight(cardHeight * 3 + gap * 2);
  }, [cards.length, list.id]);

  const listSurfaceStyle = list.color
    ? {
        backgroundColor: `${list.color}14`,
        borderColor: `${list.color}50`,
      }
    : undefined;

  return (
    <div
      className="flex-shrink-0 w-80 self-start bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex flex-col"
      style={listSurfaceStyle}
    >
      {/* Header da lista */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          {/* Indicador de cor da lista */}
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: list.color || "#94A3B8" }}
          />

          <h3 className="font-semibold text-white truncate">{list.name}</h3>

          {/* Contador de cards */}
          <span className="px-2 py-0.5 bg-slate-800/70 text-slate-400 text-xs rounded-full font-medium">
            {cards.length}
          </span>
        </div>

        {/* Menu de ações */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-slate-800/60 rounded transition-colors"
          >
            <MoreVertical size={16} className="text-slate-400" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              {/* Overlay para fechar o menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700/50 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditList?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Edit size={14} />
                  Editar lista
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onArchiveList?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Archive size={14} />
                  Arquivar lista
                </button>

                <div className="border-t border-slate-700/50"></div>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteList?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Deletar lista
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards da lista - com scroll vertical */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={(node) => {
            setNodeRef(node);
            cardsContainerRef.current = node;
          }}
          className="space-y-3 overflow-y-auto pr-1 scrollbar-muted"
          style={listMaxHeight ? { maxHeight: `${listMaxHeight}px` } : undefined}
        >
          {cards.length > 0 ? (
            cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onClick={() => onCardClick?.(card)}
              />
            ))
          ) : (
            <div className="text-center text-slate-400 text-sm py-8">
              Nenhum card nesta lista
            </div>
          )}
        </div>
      </SortableContext>

      {/* Botão adicionar card */}
      <button
        onClick={onAddCard}
        className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors flex items-center justify-center gap-2 group"
      >
        <Plus size={16} className="group-hover:scale-110 transition-transform" />
        <span>Adicionar card</span>
      </button>
    </div>
  );
};

export default KanbanList;
