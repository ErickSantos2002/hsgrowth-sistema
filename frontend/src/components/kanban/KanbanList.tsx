import React, { useEffect, useRef, useState } from "react";
import { Plus, MoreVertical, Edit, Archive, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { List, Card } from "../../types";
import { COLORS, getChartColors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import KanbanCard from "./KanbanCard";

interface KanbanListProps {
  list: List;
  cards: Card[];
  onAddCard?: () => void;
  onEditList?: () => void;
  onArchiveList?: () => void;
  onDeleteList?: () => void;
  onCardClick?: (card: Card) => void;
  onMoveLeft?: () => void; // Nova prop para mover lista para esquerda
  onMoveRight?: () => void; // Nova prop para mover lista para direita
  isFirstList?: boolean; // Se é a primeira lista (não pode ir mais para esquerda)
  isLastList?: boolean; // Se é a última lista (não pode ir mais para direita)
  canManageLists?: boolean; // Permissão para gerenciar listas (Admin/Manager)
}

const KanbanList: React.FC<KanbanListProps> = ({
  list,
  cards,
  onAddCard,
  onEditList,
  onArchiveList,
  onDeleteList,
  onCardClick,
  onMoveLeft,
  onMoveRight,
  isFirstList = false,
  isLastList = false,
  canManageLists = true, // Default true para compatibilidade
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [cardLimit, setCardLimit] = useState(3);
  const cardsContainerRef = useRef<HTMLDivElement | null>(null);
  // Cor do indicador de lista adaptada ao tema atual
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);

  useEffect(() => {
    const updateCardLimit = () => {
      setCardLimit(window.innerWidth < 640 ? 2 : 3);
    };

    updateCardLimit();
    window.addEventListener("resize", updateCardLimit);
    return () => window.removeEventListener("resize", updateCardLimit);
  }, []);

  const scrollCards = (direction: "up" | "down") => {
    if (!cardsContainerRef.current) return;
    const delta = direction === "up" ? -200 : 200;
    cardsContainerRef.current.scrollBy({ top: delta, behavior: "smooth" });
  };


  const listSurfaceStyle = list.color
    ? {
        backgroundColor: `${list.color}14`,
        borderColor: `${list.color}50`,
      }
    : undefined;

  return (
    <div
      className="flex h-full w-80 flex-shrink-0 flex-col overflow-visible rounded-xl border border-gray-200 bg-gray-50/80 p-4 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/40 sm:w-80"
      style={listSurfaceStyle}
    >
      {/* Header da lista */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Indicador de cor da lista */}
          <div
            className="h-6 w-1 rounded-full"
            style={{ backgroundColor: list.color || chartColors.content.tertiary }}
          />

          <h3 className="truncate font-semibold text-slate-900 dark:text-white">{list.name}</h3>

          {/* Contador de cards */}
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
            {cards.length}
          </span>
        </div>

        {/* Menu de ações */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-800/60"
          >
            <MoreVertical size={16} className="text-slate-500 dark:text-slate-400" />
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
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditList?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Edit size={14} />
                  Editar lista
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onArchiveList?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Archive size={14} />
                  Arquivar lista
                </button>

                <div className="border-t border-gray-200 dark:border-slate-700/50"></div>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteList?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
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
      <div className="relative min-h-0 flex-1">
        <div
          ref={cardsContainerRef}
          className="scrollbar-desktop h-full touch-pan-y space-y-3 overflow-y-auto overscroll-contain pr-10 sm:pr-1"
          style={{ WebkitOverflowScrolling: "touch" }}
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
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum card nesta lista
          </div>
        )}

        </div>

        {cards.length > cardLimit && (
          <div className="pointer-events-none absolute bottom-2 right-0 top-2 flex w-7 flex-col justify-between sm:hidden">
            <button
              type="button"
              onClick={() => scrollCards("up")}
              className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-600 transition-colors hover:bg-gray-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80"
              aria-label="Subir lista"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollCards("down")}
              className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-600 transition-colors hover:bg-gray-100 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80"
              aria-label="Descer lista"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Botão adicionar card + Setas de movimentação */}
      <div className="mt-3 flex flex-shrink-0 items-center gap-2">
        {/* Seta esquerda - apenas Admin/Manager */}
        {canManageLists && !isFirstList && onMoveLeft && (
          <button
            onClick={onMoveLeft}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
            title="Mover lista para esquerda"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Botão adicionar card */}
        <button
          onClick={onAddCard}
          className="group flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
        >
          <Plus size={16} className="transition-transform group-hover:scale-110" />
          <span>Adicionar card</span>
        </button>

        {/* Seta direita - apenas Admin/Manager */}
        {canManageLists && !isLastList && onMoveRight && (
          <button
            onClick={onMoveRight}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
            title="Mover lista para direita"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanList;
