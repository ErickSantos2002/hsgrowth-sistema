import React, { useEffect, useRef, useState } from "react";
import {
  Eye,
  Edit,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
  Calendar,
  Grid3x3,
  Target,
  TrendingUp,
  Users,
  Briefcase,
  FolderKanban,
  Lightbulb,
  Rocket,
  Star,
  Heart,
  LucideIcon,
} from "lucide-react";
import { Board } from "../../types";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";

interface BoardCardProps {
  board: Board;
  onEdit: (_board: Board) => void;
  onDuplicate: (_board: Board) => void;
  onToggleArchive: (_board: Board) => void;
  onDelete: (_board: Board) => void;
}

const BoardCard: React.FC<BoardCardProps> = ({
  board,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  /**
   * Mapeia o nome do ícone para o componente Lucide
   */
  const getIconComponent = (iconName: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      grid: Grid3x3,
      target: Target,
      "trending-up": TrendingUp,
      users: Users,
      briefcase: Briefcase,
      "folder-kanban": FolderKanban,
      lightbulb: Lightbulb,
      rocket: Rocket,
      star: Star,
      heart: Heart,
      "⬜": Grid3x3,
      "📊": TrendingUp,
      "🎯": Target,
      "💼": Briefcase,
      "🚀": Rocket,
      "📈": TrendingUp,
      "💡": Lightbulb,
      "🔥": Rocket,
      "⭐": Star,
      "❤️": Heart,
    };

    return iconMap[iconName] || Grid3x3;
  };

  const IconComponent = getIconComponent(board.icon || "grid");

  /**
   * Navega para a página de visualização do board (Kanban)
   */
  const handleViewBoard = () => {
    navigate(`/boards/${board.id}`);
  };

  /**
   * Formata a data de criação
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className={`group relative rounded-xl border-2 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
        showMenu ? "z-50" : "z-0"
      }`}
      style={{
        borderColor: board.color || COLORS.board.blue,
        backgroundColor: `${board.color || COLORS.board.blue}20`,
        boxShadow: `0 0 20px ${board.color || COLORS.board.blue}10`,
      }}
    >
      {/* Badge de status */}
      <div className="absolute right-4 top-4">
        {!board.is_deleted ? (
          <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-green-400">
            Ativo
          </span>
        ) : (
          <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-yellow-400">
            Arquivado
          </span>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="space-y-4">
        {/* Título com ícone */}
        <div className="flex items-center gap-3 pr-20">
          <div
            className="rounded-lg p-2"
            style={{
              backgroundColor: `${board.color || COLORS.board.blue}20`,
            }}
          >
            <IconComponent
              size={24}
              style={{ color: board.color || COLORS.board.blue }}
            />
          </div>
          <h3
            className="flex-1 cursor-pointer text-xl font-bold text-slate-900 dark:text-white transition-colors group-hover:text-blue-400"
            onClick={handleViewBoard}
          >
            {board.name}
          </h3>
        </div>

        {/* Descrição */}
        <p className="line-clamp-2 min-h-[40px] text-sm text-slate-500 dark:text-gray-400">
          {board.description || "Sem descrição"}
        </p>

        {/* Data de criação */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
          <Calendar size={14} />
          <span>Criado em {formatDate(board.created_at)}</span>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-700/50"></div>

        {/* Botões de ação */}
        <div className="flex items-center justify-between">
          {/* Botão primário: Visualizar */}
          <button
            onClick={handleViewBoard}
            className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            <Eye size={16} />
            Visualizar
          </button>

          {/* Menu de opções */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-700/50"
            >
              <MoreVertical size={20} className="text-slate-500 dark:text-gray-400" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                {/* Menu */}
                <div className="absolute bottom-full right-0 z-50 mb-2 w-48 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-xl">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(board);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit size={16} />
                    Editar
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(board);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleArchive(board);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {!board.is_deleted ? (
                      <>
                        <Archive size={16} />
                        Arquivar
                      </>
                    ) : (
                      <>
                        <ArchiveRestore size={16} />
                        Restaurar
                      </>
                    )}
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700"></div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(board);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                    Deletar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardCard;
