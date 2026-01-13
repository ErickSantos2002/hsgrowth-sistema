import React, { useState } from "react";
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

interface BoardCardProps {
  board: Board;
  onEdit: (board: Board) => void;
  onDuplicate: (board: Board) => void;
  onToggleArchive: (board: Board) => void;
  onDelete: (board: Board) => void;
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
      className="group relative bg-gray-800/40 backdrop-blur-sm border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-xl"
      style={{
        borderColor: board.color || "#3B82F6",
        boxShadow: `0 0 20px ${board.color || "#3B82F6"}10`,
      }}
    >
      {/* Badge de status */}
      <div className="absolute top-4 right-4">
        {!board.is_deleted ? (
          <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
            Ativo
          </span>
        ) : (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
            Arquivado
          </span>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="space-y-4">
        {/* Título com ícone */}
        <div className="pr-20 flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${board.color || "#3B82F6"}20`,
            }}
          >
            <IconComponent
              size={24}
              style={{ color: board.color || "#3B82F6" }}
            />
          </div>
          <h3
            className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer flex-1"
            onClick={handleViewBoard}
          >
            {board.name}
          </h3>
        </div>

        {/* Descrição */}
        <p className="text-gray-400 text-sm line-clamp-2 min-h-[40px]">
          {board.description || "Sem descrição"}
        </p>

        {/* Data de criação */}
        <div className="flex items-center gap-2 text-gray-500 text-xs">
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <Eye size={16} />
            Visualizar
          </button>

          {/* Menu de opções */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <MoreVertical size={20} className="text-gray-400" />
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
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(board);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <Edit size={16} />
                    Editar
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(board);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleArchive(board);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
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

                  <div className="border-t border-gray-700"></div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(board);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
