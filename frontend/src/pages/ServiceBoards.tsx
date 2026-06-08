import React, { useState, useEffect } from "react";
import {
  Plus, Search, Grid3x3, Archive, RefreshCw, CheckCircle, Wrench,
  Eye, Edit, Copy, ArchiveRestore, Trash2, MoreVertical, Calendar as CalendarIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import serviceBoardService, {
  ServiceBoard,
  CreateServiceBoardRequest,
  UpdateServiceBoardRequest,
} from "../services/serviceBoardService";
import { showSuccess, showError } from "../utils/toast";
import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useConfirm } from "../contexts/ConfirmContext";
import { COLORS } from "../constants/colors";

// ─── Modal simples de criar/editar board de serviço ──────────────────────────

interface ServiceBoardModalProps {
  board?: ServiceBoard | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_COLORS = [
  "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B",
  "#EF4444", "#06B6D4", "#EC4899", "#14B8A6",
];

const ServiceBoardModal: React.FC<ServiceBoardModalProps> = ({ board, onClose, onSuccess }) => {
  const [name, setName] = useState(board?.name || "");
  const [description, setDescription] = useState(board?.description || "");
  const [color, setColor] = useState(board?.color || "#8B5CF6");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (board) {
        await serviceBoardService.update(board.id, { name, description, color });
        showSuccess("Board atualizado com sucesso!");
      } else {
        await serviceBoardService.create({ name, description, color, icon: "wrench" });
        showSuccess("Board criado com sucesso!");
      }
      onSuccess();
    } catch {
      showError("Erro ao salvar board");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          {board ? "Editar Board" : "Novo Board de Serviços"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cor</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-white ring-2 ring-offset-1" : "border-transparent"}`}
                  style={{ backgroundColor: c, ringColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Card do board ────────────────────────────────────────────────────────────

interface ServiceBoardCardProps {
  board: ServiceBoard;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

const ServiceBoardCard: React.FC<ServiceBoardCardProps> = ({
  board, canManage, onView, onEdit, onDuplicate, onToggleArchive, onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const boardColor = board.color || "#8B5CF6";

  return (
    <div
      className={`group relative rounded-xl border-2 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${showMenu ? "z-50" : "z-0"}`}
      style={{
        borderColor: boardColor,
        backgroundColor: `${boardColor}20`,
        boxShadow: `0 0 20px ${boardColor}10`,
      }}
    >
      {/* Badge status */}
      <div className="absolute right-4 top-4">
        {!board.is_deleted ? (
          <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-green-400">Ativo</span>
        ) : (
          <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-yellow-400">Arquivado</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Título */}
        <div className="flex items-center gap-3 pr-20">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${boardColor}20` }}>
            <Wrench size={24} style={{ color: boardColor }} />
          </div>
          <h3
            className="flex-1 cursor-pointer text-xl font-bold text-slate-900 transition-colors group-hover:text-violet-400 dark:text-white"
            onClick={onView}
          >
            {board.name}
          </h3>
        </div>

        {/* Descrição */}
        <p className="line-clamp-2 min-h-[40px] text-sm text-slate-500 dark:text-gray-400">
          {board.description || "Sem descrição"}
        </p>

        {/* Contagem */}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-gray-500">
          <span>{board.lists_count ?? 0} listas</span>
          <span>{board.cards_count ?? 0} cards</span>
        </div>

        {/* Data */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
          <CalendarIcon size={14} />
          <span>Criado em {formatDate(board.created_at)}</span>
        </div>

        <div className="border-t border-gray-700/50" />

        {/* Ações */}
        <div className="flex items-center justify-between">
          <button
            onClick={onView}
            className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-4 py-2 text-violet-500 transition-colors hover:bg-violet-500/20 dark:text-violet-400"
          >
            <Eye size={16} />
            Visualizar
          </button>

          {canManage && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-700/50"
              >
                <MoreVertical size={20} className="text-slate-500 dark:text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <button onClick={() => { setShowMenu(false); onEdit(); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Edit size={16} /> Editar
                  </button>
                  <button onClick={() => { setShowMenu(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Copy size={16} /> Duplicar
                  </button>
                  <button onClick={() => { setShowMenu(false); onToggleArchive(); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700">
                    {!board.is_deleted ? <><Archive size={16} /> Arquivar</> : <><ArchiveRestore size={16} /> Restaurar</>}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                  <button onClick={() => { setShowMenu(false); onDelete(); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10">
                    <Trash2 size={16} /> Deletar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ServiceBoards: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const canManage = user?.role === "admin" || user?.role === "manager";

  const [boards, setBoards] = useState<ServiceBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<ServiceBoard | null>(null);

  useEffect(() => {
    loadBoards();
  }, [filterStatus]);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus === "active") params.is_deleted = false;
      if (filterStatus === "archived") params.is_deleted = true;
      const res = await serviceBoardService.list(params);
      setBoards(res.boards || []);
    } catch {
      showError("Erro ao carregar boards de serviços");
    } finally {
      setLoading(false);
    }
  };

  const filtered = boards.filter((b) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return b.name.toLowerCase().includes(t) || (b.description || "").toLowerCase().includes(t);
  });

  const handleEdit = (board: ServiceBoard) => { setEditingBoard(board); setIsModalOpen(true); };
  const handleCreate = () => { setEditingBoard(null); setIsModalOpen(true); };

  const handleDuplicate = async (board: ServiceBoard) => {
    try {
      await serviceBoardService.duplicate(board.id, `${board.name} - Cópia`);
      await loadBoards();
      showSuccess("Board duplicado com sucesso!");
    } catch { showError("Erro ao duplicar board"); }
  };

  const handleToggleArchive = async (board: ServiceBoard) => {
    try {
      await serviceBoardService.update(board.id, { is_deleted: !board.is_deleted });
      await loadBoards();
      showSuccess(board.is_deleted ? "Board restaurado!" : "Board arquivado!");
    } catch { showError("Erro ao atualizar board"); }
  };

  const handleDelete = async (board: ServiceBoard) => {
    const ok = await confirm({
      title: "Deletar Board",
      message: `Deletar "${board.name}"? Todas as listas e cards serão removidos permanentemente.`,
      confirmText: "Deletar",
      isDanger: true,
    });
    if (!ok) return;
    try {
      await serviceBoardService.delete(board.id);
      await loadBoards();
      showSuccess("Board deletado!");
    } catch { showError("Erro ao deletar board"); }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <Wrench className="text-slate-900 dark:text-white" size={32} />
            Boards (Serviços)
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">
            Gerencie os quadros de serviços, calibração e manutenção
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-white shadow-lg transition-all hover:from-violet-600 hover:to-purple-600"
          >
            <Plus size={20} />
            Novo Board
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "active", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex h-11 items-center gap-1.5 rounded-lg px-4 py-2 transition-colors ${
                filterStatus === s
                  ? s === "all" ? "bg-violet-500 text-white" : s === "active" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400"
              }`}
            >
              {s === "all" && <Grid3x3 size={16} />}
              {s === "active" && <CheckCircle size={16} />}
              {s === "archived" && <Archive size={16} />}
              <span className="hidden sm:inline">{s === "all" ? "Todos" : s === "active" ? "Ativos" : "Arquivados"}</span>
            </button>
          ))}
          <button
            onClick={loadBoards}
            disabled={loading}
            className="flex h-11 items-center rounded-lg bg-gray-100 px-4 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800/50 dark:text-gray-300"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200/80 dark:bg-gray-800/30" />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((board) => (
            <ServiceBoardCard
              key={board.id}
              board={board}
              canManage={canManage}
              onView={() => navigate(`/servicos/${board.id}`)}
              onEdit={() => handleEdit(board)}
              onDuplicate={() => handleDuplicate(board)}
              onToggleArchive={() => handleToggleArchive(board)}
              onDelete={() => handleDelete(board)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Grid3x3}
          title="Nenhum board encontrado"
          description={
            searchTerm || filterStatus !== "all"
              ? "Tente ajustar os filtros"
              : canManage
              ? "Crie seu primeiro board de serviços para começar"
              : "Entre em contato com o administrador para criar boards"
          }
          actionLabel={canManage ? "Criar Primeiro Board" : undefined}
          onAction={canManage ? handleCreate : undefined}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <ServiceBoardModal
          board={editingBoard}
          onClose={() => { setIsModalOpen(false); setEditingBoard(null); }}
          onSuccess={() => { setIsModalOpen(false); setEditingBoard(null); loadBoards(); }}
        />
      )}
    </div>
  );
};

export default ServiceBoards;
