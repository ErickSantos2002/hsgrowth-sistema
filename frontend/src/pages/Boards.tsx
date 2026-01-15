  import React, { useState, useEffect } from "react";
import { Plus, Search, Grid3x3, Archive, RefreshCw, CheckCircle } from "lucide-react";
import boardService from "../services/boardService";
import { Board } from "../types";
import BoardCard from "../components/boards/BoardCard";
import BoardModal from "../components/boards/BoardModal";
import EmptyState from "../components/common/EmptyState";

const Boards: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  // Carregar boards ao montar o componente
  useEffect(() => {
    loadBoards();
  }, [filterStatus, searchTerm]);

  /**
   * Carrega a lista de boards do backend
   */
  const loadBoards = async () => {
    try {
      setLoading(true);
      const filters: any = {
        search: searchTerm || undefined,
      };

      // Aplicar filtro de status
      if (filterStatus === "active") {
        filters.is_deleted = false;
      } else if (filterStatus === "archived") {
        filters.is_deleted = true;
      }

      const response = await boardService.list(filters);
      setBoards(response.boards || []);
    } catch (error) {
      console.error("Erro ao carregar boards:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre o modal para criar um novo board
   */
  const handleCreateBoard = () => {
    setEditingBoard(null);
    setIsModalOpen(true);
  };

  /**
   * Abre o modal para editar um board existente
   */
  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setIsModalOpen(true);
  };

  /**
   * Duplica um board
   */
  const handleDuplicateBoard = async (board: Board) => {
    try {
      // Usa o nome original do board + " - Cópia"
      await boardService.duplicate(board.id, `${board.name} - Cópia`);
      loadBoards();
      // TODO: Adicionar toast de sucesso
      alert("Board duplicado com sucesso!");
    } catch (error) {
      console.error("Erro ao duplicar board:", error);
      // TODO: Adicionar toast de erro
      alert("Erro ao duplicar board");
    }
  };

  /**
   * Arquiva ou ativa um board
   */
  const handleToggleArchive = async (board: Board) => {
    try {
      await boardService.update(board.id, {
        is_deleted: !board.is_deleted,
      });
      loadBoards();
      // TODO: Adicionar toast de sucesso
      const action = board.is_deleted ? "restaurado" : "arquivado";
      alert(`Board ${action} com sucesso!`);
    } catch (error) {
      console.error("Erro ao arquivar/ativar board:", error);
      // TODO: Adicionar toast de erro
      alert("Erro ao atualizar status do board");
    }
  };

  /**
   * Deleta um board
   */
  const handleDeleteBoard = async (board: Board) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o board "${board.name}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await boardService.delete(board.id);
      loadBoards();
      // TODO: Adicionar toast de sucesso
      alert("Board deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar board:", error);
      // TODO: Adicionar toast de erro
      alert("Erro ao deletar board");
    }
  };

  /**
   * Callback quando o modal é fechado com sucesso
   */
  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingBoard(null);
    loadBoards();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header com título e botões */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Boards</h1>
          <p className="text-gray-400 mt-1">
            Gerencie seus quadros Kanban e organize seus projetos
          </p>
        </div>
        <button
          onClick={handleCreateBoard}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          Novo Board
        </button>
      </div>

      {/* Barra de filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Campo de busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filtro por status + atualizar */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Grid3x3 size={20} className="inline mr-2" />
            Todos
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === "active"
                ? "bg-green-500 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <CheckCircle size={20} className="inline mr-2" />
            Ativos
          </button>
          <button
            onClick={() => setFilterStatus("archived")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === "archived"
                ? "bg-yellow-500 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Archive size={20} className="inline mr-2" />
            Arquivados
          </button>

          {/* Botão de refresh */}
          <button
            onClick={loadBoards}
            disabled={loading}
            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-800/30 backdrop-blur-sm rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Grid de boards */}
      {!loading && boards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onEdit={handleEditBoard}
              onDuplicate={handleDuplicateBoard}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDeleteBoard}
            />
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && boards.length === 0 && (
        <EmptyState
          icon={Grid3x3}
          title="Nenhum board encontrado"
          description={
            searchTerm || filterStatus !== "all"
              ? "Tente ajustar os filtros ou criar um novo board"
              : "Crie seu primeiro board para começar a organizar suas tarefas"
          }
          actionLabel="Criar Primeiro Board"
          onAction={handleCreateBoard}
        />
      )}

      {/* Modal de criar/editar board */}
      {isModalOpen && (
        <BoardModal
          board={editingBoard}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBoard(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Boards;
