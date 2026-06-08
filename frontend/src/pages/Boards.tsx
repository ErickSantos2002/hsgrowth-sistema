import React, { useState, useEffect } from "react";
import { Plus, Search, Grid3x3, Archive, RefreshCw, CheckCircle, Trello, Download, Upload, CalendarDays, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import boardService from "../services/boardService";
import { Board } from "../types";
import BoardCard from "../components/boards/BoardCard";
import BoardModal from "../components/boards/BoardModal";
import ExportCardsModal from "../components/boards/ExportCardsModal";
import ImportCardsModal from "../components/boards/ImportCardsModal";
import { showSuccess, showError } from "../utils/toast";
import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useConfirm } from "../contexts/ConfirmContext";

interface BoardsProps {
  category?: "vendas" | "servicos";
}

const Boards: React.FC<BoardsProps> = ({ category }) => {
  const { user } = useAuth(); // Pegar usuário logado
  const { confirm } = useConfirm();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Permissões: Apenas Admin e Manager podem criar boards
  const canCreateBoard = user?.role === "admin" || user?.role === "manager";

  // Visualizadores têm acesso somente leitura
  const isViewer = user?.role === "viewer";

  // Carregar boards ao montar o componente
  useEffect(() => {
    loadBoards();
  }, [filterStatus, searchTerm, category]);

  /**
   * Carrega a lista de boards do backend
   */
  const loadBoards = async () => {
    try {
      setLoading(true);
      const filters: any = {
        search: searchTerm || undefined,
        category: category || undefined,
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
      showSuccess("Board duplicado com sucesso!");
    } catch (error) {
      console.error("Erro ao duplicar board:", error);
      // TODO: Adicionar toast de erro
      showError("Erro ao duplicar board");
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
      showSuccess(`Board ${action} com sucesso!`);
    } catch (error) {
      console.error("Erro ao arquivar/ativar board:", error);
      // TODO: Adicionar toast de erro
      showError("Erro ao atualizar status do board");
    }
  };

  /**
   * Deleta um board
   */
  const handleDeleteBoard = async (board: Board) => {
    const confirmed = await confirm({
      title: "Deletar Board",
      message: `Tem certeza que deseja deletar o board "${board.name}"? Todos os cards e listas serão removidos permanentemente.`,
      confirmText: "Deletar",
      isDanger: true,
    });

    if (!confirmed) return;

    try {
      await boardService.delete(board.id);
      loadBoards();
      // TODO: Adicionar toast de sucesso
      showSuccess("Board deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar board:", error);
      // TODO: Adicionar toast de erro
      showError("Erro ao deletar board");
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

  const isServicos = category === "servicos";
  const pageTitle = isServicos ? "Boards (Serviços)" : "Boards (Vendas)";
  const pageDescription = isServicos
    ? "Gerencie os quadros de serviços, calibração e manutenção"
    : "Gerencie seus quadros Kanban e organize seus projetos";
  const PageIcon = isServicos ? Wrench : Trello;

  return (
    <div className="space-y-6 p-6">
      {/* Header com título e botões */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <PageIcon className="text-slate-900 dark:text-white" size={32} />
            {pageTitle}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">
            {pageDescription}
          </p>
        </div>
        {/* Botões do header */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {/* Botão Calendário Global - visível para todos os usuários */}
          <Link
            to="/calendar"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 transition-all hover:bg-blue-500/20 sm:flex-none"
          >
            <CalendarDays size={20} className="text-slate-900 dark:text-blue-400" />
            <span className="hidden sm:inline text-slate-900 dark:text-blue-400">Calendário</span>
          </Link>

          {/* Botão Novo Board - Apenas Admin e Manager */}
          {canCreateBoard && (
            <button
              onClick={handleCreateBoard}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-lg transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl sm:w-auto"
            >
              <Plus size={20} />
              Novo Board
            </button>
          )}

          {/* Botão Importar */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-blue-400 transition-all hover:bg-blue-500/30"
          >
            <Upload className="h-4 w-4 text-slate-900 dark:text-blue-400" />
            <span className="hidden sm:inline text-slate-900 dark:text-blue-400">Importar</span>
          </button>

          {/* Botão Exportar */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-green-400 transition-all hover:bg-green-500/30"
          >
            <Download className="h-4 w-4 text-slate-900 dark:text-green-400" />
            <span className="hidden sm:inline text-slate-900 dark:text-green-400">Exportar</span>
          </button>
        </div>
      </div>

      {/* Barra de filtros e busca */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
          />
        </div>

        {/* Filtro por status + atualizar */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg px-4 py-2 transition-colors sm:flex-none ${
              filterStatus === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <Grid3x3 size={20} className="inline sm:mr-2" />
            <span className="hidden sm:inline">Todos</span>
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg px-4 py-2 transition-colors sm:flex-none ${
              filterStatus === "active"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <CheckCircle size={20} className="inline sm:mr-2" />
            <span className="hidden sm:inline">Ativos</span>
          </button>
          <button
            onClick={() => setFilterStatus("archived")}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg px-4 py-2 transition-colors sm:flex-none ${
              filterStatus === "archived"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <Archive size={20} className="inline sm:mr-2" />
            <span className="hidden sm:inline">Arquivados</span>
          </button>

          {/* Botão de refresh */}
          <button
            onClick={loadBoards}
            disabled={loading}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 sm:flex-none"
            title="Atualizar lista"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-gray-200/80 backdrop-blur-sm dark:bg-gray-800/30"
            />
          ))}
        </div>
      )}

      {/* Grid de boards */}
      {!loading && boards.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onEdit={handleEditBoard}
              onDuplicate={handleDuplicateBoard}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDeleteBoard}
              canManageBoard={canCreateBoard}
              basePath={isServicos ? "/servicos" : "/boards"}
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
              ? "Tente ajustar os filtros"
              : canCreateBoard
              ? "Crie seu primeiro board para começar a organizar suas tarefas"
              : "Entre em contato com o administrador para criar boards"
          }
          actionLabel={canCreateBoard ? "Criar Primeiro Board" : undefined}
          onAction={canCreateBoard ? handleCreateBoard : undefined}
        />
      )}

      {/* Modal de criar/editar board */}
      {isModalOpen && (
        <BoardModal
          board={editingBoard}
          defaultCategory={category}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBoard(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Modal de exportação de cards para Excel */}
      <ExportCardsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        boards={boards}
      />

      {/* Modal de importação em lote via planilha */}
      <ImportCardsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default Boards;
