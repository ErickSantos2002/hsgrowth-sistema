import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Search, Grid3x3, Archive, RefreshCw, CheckCircle, Wrench,
  Eye, Edit, Copy, ArchiveRestore, Trash2, MoreVertical, Calendar as CalendarIcon,
  CalendarDays, ChevronDown, Settings, Hammer, Gauge, Package,
  ClipboardList, Cog, FlaskConical, Microscope, LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import serviceBoardService, {
  ServiceBoard,
} from "../services/serviceBoardService";
import { showSuccess, showError } from "../utils/toast";
import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useConfirm } from "../contexts/ConfirmContext";
import { BaseModal, FormField, Input, Textarea, Button, Alert } from "../components/common";
import { COLORS } from "../constants/colors";

// ─── Modal de criar/editar board de serviço ───────────────────────────────────

interface ServiceBoardModalProps {
  board?: ServiceBoard | null;
  onClose: () => void;
  onSuccess: () => void;
}

const iconOptions: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "wrench",        label: "Chave",       icon: Wrench },
  { value: "settings",      label: "Engrenagem",  icon: Settings },
  { value: "hammer",        label: "Martelo",     icon: Hammer },
  { value: "gauge",         label: "Calibração",  icon: Gauge },
  { value: "package",       label: "Pacote",      icon: Package },
  { value: "clipboard",     label: "Checklist",   icon: ClipboardList },
  { value: "cog",           label: "Peça",        icon: Cog },
  { value: "flask",         label: "Lab",         icon: FlaskConical },
  { value: "microscope",    label: "Análise",     icon: Microscope },
  { value: "grid",          label: "Grid",        icon: Grid3x3 },
];

const colorPresets = [
  COLORS.board.purple,
  COLORS.board.blue,
  COLORS.board.green,
  COLORS.board.amber,
  COLORS.board.red,
  COLORS.board.pink,
  COLORS.board.gray,
];

const ServiceBoardModal: React.FC<ServiceBoardModalProps> = ({ board, onClose, onSuccess }) => {
  const isEditing = !!board;
  const [formData, setFormData] = useState({
    name: board?.name || "",
    description: board?.description || "",
    color: board?.color || COLORS.board.purple,
    icon: board?.icon || "wrench",
  });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [isIconOpen, setIsIconOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) setIsIconOpen(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setIsColorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const validate = () => {
    const errs: { name?: string } = {};
    if (!formData.name.trim()) errs.name = "Nome é obrigatório";
    else if (formData.name.trim().length < 3) errs.name = "Nome deve ter pelo menos 3 caracteres";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing && board) {
        await serviceBoardService.update(board.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon,
        });
        showSuccess("Board atualizado com sucesso!");
      } else {
        await serviceBoardService.create({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon,
        });
        showSuccess("Board criado com sucesso!");
      }
      onSuccess();
    } catch {
      showError("Erro ao salvar board");
    } finally {
      setSaving(false);
    }
  };

  const selectedIcon = iconOptions.find((o) => o.value === formData.icon) || iconOptions[0];
  const SelectedIconComp = selectedIcon.icon;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Editar Board" : "Novo Board de Serviços"}
      subtitle={isEditing ? "Edite as informações do board" : "Crie um novo board para organizar os serviços"}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!formData.name.trim()}>
            {isEditing ? "Salvar Alterações" : "Criar Board"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEditing && (
          <Alert type="help">
            <strong>Dica:</strong> Após criar o board, você poderá adicionar listas e cards para organizar os serviços.
          </Alert>
        )}

        <FormField label="Nome do Board" required error={errors.name}>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Calibração 2024, Manutenção Preventiva..."
            error={!!errors.name}
            disabled={saving}
            autoFocus
          />
        </FormField>

        <FormField label="Descrição" hint="Breve descrição sobre o objetivo deste board (opcional, até 200 caracteres)">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Board para gerenciar serviços de calibração e manutenção..."
            rows={3}
            disabled={saving}
            maxLength={200}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Ícone */}
          <FormField label="Ícone" hint="Clique para escolher um ícone do board">
            <div ref={iconRef} className="relative">
              <button
                type="button"
                onClick={() => { setIsIconOpen((o) => !o); setIsColorOpen(false); }}
                disabled={saving}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-3">
                  <SelectedIconComp size={20} />
                  <span className="text-sm">{selectedIcon.label}</span>
                </span>
                <ChevronDown size={18} className="text-slate-400" />
              </button>
              {isIconOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl">
                  <div className="grid grid-cols-5 gap-2">
                    {iconOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setFormData({ ...formData, icon: opt.value }); setIsIconOpen(false); }}
                        className={`flex aspect-square items-center justify-center rounded-lg transition-all ${
                          formData.icon === opt.value
                            ? "scale-105 bg-gray-200 dark:bg-slate-700 ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                            : "bg-gray-100/50 dark:bg-slate-800/50 hover:scale-105 hover:bg-gray-200 dark:hover:bg-slate-700"
                        }`}
                        title={opt.label}
                      >
                        <opt.icon size={22} className="text-slate-700 dark:text-slate-200" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormField>

          {/* Cor */}
          <FormField label="Cor" hint="Clique para escolher uma cor predefinida">
            <div ref={colorRef} className="relative">
              <button
                type="button"
                onClick={() => { setIsColorOpen((o) => !o); setIsIconOpen(false); }}
                disabled={saving}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-md border border-gray-300 dark:border-slate-600" style={{ backgroundColor: formData.color }} />
                  <span className="text-sm">{formData.color}</span>
                </span>
                <ChevronDown size={18} className="text-slate-400" />
              </button>
              {isColorOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl">
                  <div className="grid grid-cols-7 gap-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setFormData({ ...formData, color: c }); setIsColorOpen(false); }}
                        className={`aspect-square rounded-lg transition-all hover:scale-105 ${formData.color === c ? "scale-105 ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""}`}
                        style={{ backgroundColor: c }}
                      >
                        {formData.color === c && (
                          <svg className="h-full w-full p-2 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </FormField>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          <p className="mb-3 text-xs font-medium text-slate-400">Preview:</p>
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: `${formData.color}20` }}>
              <SelectedIconComp size={28} style={{ color: formData.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {formData.name.trim() || "Nome do Board"}
              </h3>
              <p className="mt-0.5 text-sm text-slate-400">
                {(formData.description.trim() || "Sem descrição").slice(0, 200)}
              </p>
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
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
  // Ícone escolhido no board (cai em Chave/Wrench se não houver correspondência).
  const BoardIcon = iconOptions.find((o) => o.value === board.icon)?.icon || Wrench;

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
            <BoardIcon size={24} style={{ color: boardColor }} />
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

        {/* Contagem de listas e cards */}
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
                    {!board.is_deleted
                      ? <><Archive size={16} /> Arquivar</>
                      : <><ArchiveRestore size={16} /> Restaurar</>
                    }
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
  }, [filterStatus, searchTerm]);

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

  const handleCreate = () => { setEditingBoard(null); setIsModalOpen(true); };
  const handleEdit = (board: ServiceBoard) => { setEditingBoard(board); setIsModalOpen(true); };

  const handleDuplicate = async (board: ServiceBoard) => {
    try {
      await serviceBoardService.duplicate(board.id, `${board.name} - Cópia`);
      await loadBoards();
      showSuccess("Board duplicado com sucesso!");
    } catch {
      showError("Erro ao duplicar board");
    }
  };

  const handleToggleArchive = async (board: ServiceBoard) => {
    try {
      await serviceBoardService.update(board.id, { is_deleted: !board.is_deleted });
      await loadBoards();
      const action = board.is_deleted ? "restaurado" : "arquivado";
      showSuccess(`Board ${action} com sucesso!`);
    } catch {
      showError("Erro ao atualizar status do board");
    }
  };

  const handleDelete = async (board: ServiceBoard) => {
    const ok = await confirm({
      title: "Deletar Board",
      message: `Tem certeza que deseja deletar o board "${board.name}"? Todos os cards e listas serão removidos permanentemente.`,
      confirmText: "Deletar",
      isDanger: true,
    });
    if (!ok) return;
    try {
      await serviceBoardService.delete(board.id);
      await loadBoards();
      showSuccess("Board deletado com sucesso!");
    } catch {
      showError("Erro ao deletar board");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header com título e botões */}
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

        {/* Botões do header */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {/* Botão Calendário de Serviços (atividades de toda a equipe) */}
          <Link
            to="/servicos/calendario"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 transition-all hover:bg-violet-500/20 sm:flex-none"
          >
            <CalendarDays size={20} className="text-slate-900 dark:text-violet-400" />
            <span className="hidden sm:inline text-slate-900 dark:text-violet-400">Calendário</span>
          </Link>

          {/* Botão Novo Board - Apenas Admin e Manager */}
          {canManage && (
            <button
              onClick={handleCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-white shadow-lg transition-all hover:from-violet-600 hover:to-purple-600 hover:shadow-xl sm:w-auto"
            >
              <Plus size={20} />
              Novo Board
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros e busca */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
          />
        </div>

        {/* Filtro por status + atualizar */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg px-4 py-2 transition-colors sm:flex-none ${
              filterStatus === "all"
                ? "bg-violet-500 text-white"
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
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200/80 backdrop-blur-sm dark:bg-gray-800/30" />
          ))}
        </div>
      )}

      {/* Grid de boards */}
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

      {/* Estado vazio */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Grid3x3}
          title="Nenhum board encontrado"
          description={
            searchTerm || filterStatus !== "all"
              ? "Tente ajustar os filtros"
              : canManage
              ? "Crie seu primeiro board de serviços para começar a organizar as tarefas"
              : "Entre em contato com o administrador para criar boards"
          }
          actionLabel={canManage ? "Criar Primeiro Board" : undefined}
          onAction={canManage ? handleCreate : undefined}
        />
      )}

      {/* Modal de criar/editar board */}
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
