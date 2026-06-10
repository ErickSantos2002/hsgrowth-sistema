import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, MoreVertical, Edit, Trash2,
  Wrench, X, ChevronLeft, ChevronRight, ChevronDown,
  Grid3x3, Target, TrendingUp, Users, Briefcase, FolderKanban,
  Lightbulb, Rocket, Star, Heart, LucideIcon,
  Settings, Hammer, Gauge, Package, ClipboardList, Cog, FlaskConical,
  Microscope, Archive, Copy, CheckSquare, AlarmClock, Calendar, Filter,
} from "lucide-react";
import serviceBoardService, {
  ServiceBoard,
  ServiceList,
  ServiceCard,
} from "../services/serviceBoardService";
import { showSuccess, showError } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import { BaseModal, FormField, Input, Textarea, Button, LoadingSpinner } from "../components/common";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../constants/colors";
import ServiceCardModal from "../components/service/ServiceCardModal";
import userService from "../services/userService";
import { User as UserType } from "../types";

// ─── Icon maps ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  grid: Grid3x3, target: Target, "trending-up": TrendingUp, users: Users,
  briefcase: Briefcase, "folder-kanban": FolderKanban, lightbulb: Lightbulb,
  rocket: Rocket, star: Star, heart: Heart, wrench: Wrench,
  settings: Settings, hammer: Hammer, gauge: Gauge, package: Package,
  clipboard: ClipboardList, cog: Cog, flask: FlaskConical, microscope: Microscope,
};
const getIcon = (name: string): LucideIcon => ICON_MAP[name] || Wrench;

const SERVICE_ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "wrench",     label: "Chave",      icon: Wrench },
  { value: "settings",   label: "Engrenagem", icon: Settings },
  { value: "hammer",     label: "Martelo",    icon: Hammer },
  { value: "gauge",      label: "Calibração", icon: Gauge },
  { value: "package",    label: "Pacote",     icon: Package },
  { value: "clipboard",  label: "Checklist",  icon: ClipboardList },
  { value: "cog",        label: "Peça",       icon: Cog },
  { value: "flask",      label: "Lab",        icon: FlaskConical },
  { value: "microscope", label: "Análise",    icon: Microscope },
  { value: "grid",       label: "Grid",       icon: Grid3x3 },
];

const COLOR_PRESETS = [
  COLORS.board.purple, COLORS.board.blue, COLORS.board.green,
  COLORS.board.amber,  COLORS.board.red,  COLORS.board.pink, COLORS.board.gray,
];

// ─── Modal de edição do board ─────────────────────────────────────────────────

interface BoardEditModalProps {
  board: ServiceBoard;
  onClose: () => void;
  onSuccess: (updated: { name: string; description?: string; color: string; icon: string }) => void;
}

const BoardEditModal: React.FC<BoardEditModalProps> = ({ board, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || "",
    color: board.color || COLORS.board.purple,
    icon: board.icon || "wrench",
  });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [isIconOpen, setIsIconOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

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
      await serviceBoardService.update(board.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        icon: formData.icon,
      });
      onSuccess({ name: formData.name.trim(), description: formData.description.trim() || undefined, color: formData.color, icon: formData.icon });
      showSuccess("Board atualizado!");
    } catch {
      showError("Erro ao salvar board");
    } finally {
      setSaving(false);
    }
  };

  const selectedIcon = SERVICE_ICON_OPTIONS.find((o) => o.value === formData.icon) || SERVICE_ICON_OPTIONS[0];
  const SelectedIconComp = selectedIcon.icon;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Editar Board"
      subtitle="Edite as informações do board de serviços"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!formData.name.trim()}>
            Salvar Alterações
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <FormField label="Descrição" hint="Breve descrição (opcional, até 200 caracteres)">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            disabled={saving}
            maxLength={200}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Ícone" hint="Clique para escolher">
            <div ref={iconRef} className="relative">
              <button
                type="button"
                onClick={() => { setIsIconOpen((o) => !o); setIsColorOpen(false); }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-3"><SelectedIconComp size={20} /><span className="text-sm">{selectedIcon.label}</span></span>
                <ChevronDown size={18} className="text-slate-400" />
              </button>
              {isIconOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl">
                  <div className="grid grid-cols-5 gap-2">
                    {SERVICE_ICON_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => { setFormData({ ...formData, icon: opt.value }); setIsIconOpen(false); }}
                        className={`flex aspect-square items-center justify-center rounded-lg transition-all ${formData.icon === opt.value ? "scale-105 bg-gray-200 dark:bg-slate-700 ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : "bg-gray-100/50 dark:bg-slate-800/50 hover:scale-105 hover:bg-gray-200 dark:hover:bg-slate-700"}`}
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

          <FormField label="Cor" hint="Clique para escolher">
            <div ref={colorRef} className="relative">
              <button
                type="button"
                onClick={() => { setIsColorOpen((o) => !o); setIsIconOpen(false); }}
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
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} type="button"
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
                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800" />
                    <Input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="#8B5CF6" className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          </FormField>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          <p className="mb-3 text-xs font-medium text-slate-400">Preview:</p>
          <div className="flex items-center gap-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: `${formData.color}20` }}>
              <SelectedIconComp size={28} style={{ color: formData.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.name.trim() || "Nome do Board"}</h3>
              <p className="mt-0.5 text-sm text-slate-400">{formData.description.trim() || "Sem descrição"}</p>
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

// ─── Modal de lista ───────────────────────────────────────────────────────────

interface ServiceListModalProps {
  list?: ServiceList | null;
  boardId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ServiceListModal: React.FC<ServiceListModalProps> = ({ list, boardId, onClose, onSuccess }) => {
  const [name, setName] = useState(list?.name || "");
  const [color, setColor] = useState(list?.color || COLORS.board.purple);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setIsColorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: "Nome é obrigatório" }); return; }
    setSaving(true);
    try {
      if (list) {
        await serviceBoardService.updateList(boardId, list.id, { name: name.trim(), color });
      } else {
        await serviceBoardService.createList(boardId, { board_id: boardId, name: name.trim(), color });
      }
      onSuccess();
    } catch {
      showError("Erro ao salvar lista");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={list ? "Editar Lista" : "Nova Lista"}
      subtitle={list ? "Edite as informações da lista" : "Crie uma nova lista para organizar os cards"}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!name.trim()}>
            {list ? "Salvar Alterações" : "Criar Lista"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Nome da Lista" required error={errors.name}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Em Análise, Aguardando Aprovação, Concluído..."
            error={!!errors.name}
            disabled={saving}
            autoFocus
          />
        </FormField>

        <FormField label="Cor da Lista" hint="Clique para escolher uma cor predefinida">
          <div ref={colorRef} className="relative">
            <button
              type="button"
              onClick={() => setIsColorOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-md border border-gray-300 dark:border-slate-600" style={{ backgroundColor: color }} />
                <span className="text-sm">{color}</span>
              </span>
              <ChevronDown size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
            {isColorOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="grid grid-cols-7 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} type="button"
                      onClick={() => { setColor(c); setIsColorOpen(false); }}
                      className={`aspect-square rounded-lg transition-all hover:scale-105 ${color === c ? "scale-105 ring-2 ring-white ring-offset-2 ring-offset-gray-50 dark:ring-offset-slate-900" : ""}`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <svg className="h-full w-full p-2 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800" />
                  <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder={COLORS.board.purple} className="flex-1" />
                </div>
              </div>
            )}
          </div>
        </FormField>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-400">Preview:</p>
          <div className="rounded-lg border p-4" style={{ borderColor: `${color}50`, backgroundColor: `${color}14` }}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">{name.trim() || "Nome da Lista"}</h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Lista de cards</p>
              </div>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">0 cards</span>
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

// ─── Card do kanban ───────────────────────────────────────────────────────────

interface KanbanCardProps {
  card: ServiceCard;
  onOpenDetail: () => void;
}

const CardBadge: React.FC<{ cls: string; icon: React.ReactNode; label: string; title?: string }> = ({ cls, icon, label, title }) => (
  <span title={title} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
    {icon}{label}
  </span>
);

const CardAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-semibold text-violet-400" title={name}>
      {initials}
    </div>
  );
};

const KanbanServiceCard: React.FC<KanbanCardProps> = ({ card, onOpenDetail }) => {
  const status = card.pending_status || "none";
  const stuck = card.is_stuck_3d;
  const pendingCount = card.pending_count || 0;

  const topBadgeCls =
    status === "overdue" ? "bg-red-500/20 text-red-400"
    : status === "today" ? "bg-green-500/20 text-green-400"
    : status === "future" ? "bg-purple-500/20 text-purple-400"
    : "bg-gray-100 text-slate-400 dark:bg-slate-700/40 dark:text-slate-500";

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const dueOverdue = card.due_date ? new Date(card.due_date) < todayStart : false;
  const fmtValue = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div
      data-service-card
      onClick={onOpenDetail}
      className={`relative cursor-pointer rounded-lg border p-3.5 shadow-sm transition-all hover:shadow-md ${
        stuck ? "border-red-500/40 bg-white dark:border-red-500/30 dark:bg-red-950/20" : "border-gray-200 bg-white dark:border-slate-700/30 dark:bg-white/5"
      }`}
    >
      {/* Indicador de atividades pendentes (canto superior direito) */}
      <div
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${topBadgeCls}`}
        title={
          status === "overdue" ? `${pendingCount} atividade(s) atrasada(s)`
          : status === "today" ? `${pendingCount} atividade(s) para hoje`
          : status === "future" ? `${pendingCount} atividade(s) futura(s)`
          : "Sem atividades pendentes"
        }
      >
        <CheckSquare size={13} />
      </div>

      <h4 className="mb-2 line-clamp-2 pr-9 text-sm font-medium leading-snug text-slate-900 dark:text-white">{card.title}</h4>

      {card.client_name && <p className="mb-1 truncate text-xs text-slate-500 dark:text-slate-400">{card.client_name}</p>}

      {/* Badges de atividade / parado */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {stuck && <CardBadge cls="bg-red-500/15 text-red-500 dark:text-red-400" icon={<AlarmClock size={11} />} label="Parado 3d+" title="Card sem movimentação há mais de 3 dias" />}
        {status === "overdue" && <CardBadge cls="bg-red-500/15 text-red-500 dark:text-red-400" icon={<CheckSquare size={11} />} label="Atrasada" />}
        {status === "today" && <CardBadge cls="bg-green-500/15 text-green-600 dark:text-green-400" icon={<CheckSquare size={11} />} label="Para Hoje" />}
        {status === "future" && <CardBadge cls="bg-purple-500/15 text-purple-600 dark:text-purple-400" icon={<CheckSquare size={11} />} label="Futura" />}
        {pendingCount === 0 && <CardBadge cls="bg-slate-500/10 text-slate-400 dark:text-slate-500" icon={<CheckSquare size={11} />} label="Sem Atividade" />}
        {card.due_date && (
          <CardBadge
            cls={dueOverdue ? "bg-red-500/20 font-medium text-red-400" : "bg-gray-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"}
            icon={<Calendar size={11} />}
            label={new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          />
        )}
      </div>

      {/* Rodapé: valor + responsável */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-green-500 dark:text-green-400">{card.value ? fmtValue(card.value) : ""}</span>
        {card.assigned_to_name && <CardAvatar name={card.assigned_to_name} />}
      </div>
    </div>
  );
};

// ─── Coluna do kanban ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  list: ServiceList;
  cards: ServiceCard[];
  allLists: ServiceList[];
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onAddCard: () => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onOpenCard: (card: ServiceCard) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list, cards, allLists, canManage, isFirst, isLast,
  onAddCard, onEditList, onDeleteList, onMoveLeft, onMoveRight,
  onOpenCard,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const colColor = list.color || COLORS.board.purple;

  return (
    <div
      className="flex h-full w-80 flex-shrink-0 flex-col overflow-visible rounded-xl border p-4 backdrop-blur-sm"
      style={{
        backgroundColor: `${colColor}14`,
        borderColor: `${colColor}50`,
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-6 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: colColor }} />
          <h3 className="truncate font-semibold text-slate-900 dark:text-white">{list.name}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
            {cards.length}
          </span>
        </div>

        {canManage && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-800/60"
            >
              <MoreVertical size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
                  <button onClick={() => { setShowMenu(false); onEditList(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Edit size={14} /> Editar lista
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-700/50" />
                  <button onClick={() => { setShowMenu(false); onDeleteList(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10">
                    <Trash2 size={14} /> Deletar lista
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="scrollbar-desktop min-h-0 flex-1 space-y-3 overflow-y-auto">
        {cards.length > 0 ? (
          cards.map((card) => (
            <KanbanServiceCard
              key={card.id}
              card={card}
              onOpenDetail={() => onOpenCard(card)}
            />
          ))
        ) : (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum card nesta lista
          </div>
        )}
      </div>

      {/* Rodapé: setas + Adicionar card */}
      <div className="mt-3 flex flex-shrink-0 items-center gap-2">
        {canManage && !isFirst && (
          <button onClick={onMoveLeft} title="Mover para esquerda"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white">
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          onClick={onAddCard}
          className="group flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
        >
          <Plus size={16} className="transition-transform group-hover:scale-110" />
          Adicionar card
        </button>
        {canManage && !isLast && (
          <button onClick={onMoveRight} title="Mover para direita"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white">
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ServiceKanban: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const canManage = user?.role === "admin" || user?.role === "manager";
  const isViewer = user?.role === "viewer";

  const [board, setBoard] = useState<ServiceBoard | null>(null);
  const [lists, setLists] = useState<ServiceList[]>([]);
  const [cards, setCards] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showBoardEditModal, setShowBoardEditModal] = useState(false);

  const [showListModal, setShowListModal] = useState(false);
  const [editingList, setEditingList] = useState<ServiceList | null>(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<ServiceCard | null>(null);
  const [selectedListId, setSelectedListId] = useState<number>(0);

  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, scrollLeft: 0 });

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [fStatus, setFStatus] = useState("abertos"); // abertos | todos | ganhos | perdidos
  const [fAssignee, setFAssignee] = useState("");
  const [fValue, setFValue] = useState("");
  const [fTag, setFTag] = useState("");
  const [fCriacao, setFCriacao] = useState("");
  const [fFechamento, setFFechamento] = useState("");

  const clearFilters = () => {
    setFStatus("abertos"); setFAssignee(""); setFValue(""); setFTag("");
    setFCriacao(""); setFFechamento("");
  };
  const filtersActive = fStatus !== "abertos" || !!fAssignee || !!fValue || !!fTag || !!fCriacao || !!fFechamento;

  const numId = Number(boardId);

  const loadData = async () => {
    if (!numId) return;
    setLoading(true);
    try {
      const [boardData, listsData] = await Promise.all([
        serviceBoardService.getById(numId),
        serviceBoardService.getLists(numId),
      ]);
      setBoard(boardData);
      setLists([...listsData].sort((a, b) => a.position - b.position));
      setLoading(false);
      const cardsData = await serviceBoardService.getCards(numId);
      setCards(cardsData.cards || []);
    } catch {
      setLoading(false);
      showError("Erro ao carregar board de serviços");
      navigate("/servicos");
    }
  };

  const reloadCards = async () => {
    if (!numId) return;
    try {
      const data = await serviceBoardService.getCards(numId);
      setCards(data.cards || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadData(); }, [numId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega usuários para o filtro "Pós Vendas"
  useEffect(() => {
    userService.listActive().then(setUsers).catch(() => {});
  }, []);

  // Scroll drag
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-service-card]") || target.closest("button, input, select, textarea")) return;
    setIsDragging(true);
    dragRef.current = { startX: e.pageX, scrollLeft: boardScrollRef.current?.scrollLeft || 0 };
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !boardScrollRef.current) return;
    boardScrollRef.current.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.startX);
  };
  const onMouseUp = () => setIsDragging(false);

  // Board handlers
  const handleArchiveBoard = async () => {
    setShowBoardMenu(false);
    if (!board) return;
    const ok = await confirm({
      title: "Arquivar Board",
      message: `Arquivar "${board.name}"? Ele ficará disponível na seção de arquivados.`,
      confirmText: "Arquivar",
      isDanger: false,
    });
    if (!ok) return;
    try {
      await serviceBoardService.update(board.id, { is_deleted: true });
      showSuccess("Board arquivado com sucesso!");
      navigate("/servicos");
    } catch {
      showError("Erro ao arquivar board");
    }
  };

  const handleDuplicateBoard = async () => {
    setShowBoardMenu(false);
    if (!board) return;
    try {
      await serviceBoardService.duplicate(board.id, `${board.name} - Cópia`);
      showSuccess("Board duplicado com sucesso!");
      navigate("/servicos");
    } catch {
      showError("Erro ao duplicar board");
    }
  };

  // List handlers
  const handleCreateList = () => { setEditingList(null); setShowListModal(true); };
  const handleEditList = (list: ServiceList) => { setEditingList(list); setShowListModal(true); };
  const handleDeleteList = async (list: ServiceList) => {
    const ok = await confirm({ title: "Deletar Lista", message: `Deletar "${list.name}"? Todos os cards serão removidos.`, confirmText: "Deletar", isDanger: true });
    if (!ok) return;
    try {
      await serviceBoardService.deleteList(numId, list.id);
      await loadData();
      showSuccess("Lista deletada!");
    } catch { showError("Erro ao deletar lista"); }
  };
  const handleMoveListLeft = async (list: ServiceList) => {
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx <= 0) return;
    try { await serviceBoardService.moveList(numId, list.id, lists[idx - 1].position); await loadData(); }
    catch { showError("Erro ao mover lista"); }
  };
  const handleMoveListRight = async (list: ServiceList) => {
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= lists.length - 1) return;
    try { await serviceBoardService.moveList(numId, list.id, lists[idx + 1].position); await loadData(); }
    catch { showError("Erro ao mover lista"); }
  };

  // Card handlers
  const handleAddCard = (listId: number) => { setEditingCard(null); setSelectedListId(listId); setShowCardModal(true); };
  const handleOpenDetail = (card: ServiceCard) => { navigate(`/servicos/${numId}/cards/${card.id}`); };

  const handleSaveCard = async (data: { list_id: number; title: string; description?: string; due_date?: string; client_id?: number | null; person_id?: number | null }) => {
    try {
      if (editingCard) {
        await serviceBoardService.updateCard(numId, editingCard.id, data);
      } else {
        await serviceBoardService.createCard(numId, data);
      }
      setShowCardModal(false);
      await reloadCards();
      showSuccess(editingCard ? "Card atualizado!" : "Card criado!");
    } catch {
      showError("Erro ao salvar card");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando board de serviços...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg text-slate-500 dark:text-slate-400">Board não encontrado</p>
          <button onClick={() => navigate("/servicos")} className="rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600">
            Voltar para Boards
          </button>
        </div>
      </div>
    );
  }

  const BoardIcon = getIcon(board.icon || "wrench");
  const boardColor = board.color || COLORS.board.purple;

  // ─── Aplicação dos filtros (client-side) ────────────────────────────────────
  const listById = (id: number) => lists.find((l) => l.id === id);
  const isDoneCard = (c: ServiceCard) => { const l = listById(c.list_id); return !!(l?.is_done_stage || /ganho/i.test(l?.name || "")); };
  const isLostCard = (c: ServiceCard) => { const l = listById(c.list_id); return !!(l?.is_lost_stage || /perdido/i.test(l?.name || "")); };

  const inPeriod = (dateStr: string | undefined, period: string): boolean => {
    if (!period) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
      case "hoje": return d >= startToday;
      case "ontem": { const y = new Date(startToday); y.setDate(y.getDate() - 1); return d >= y && d < startToday; }
      case "semana": { const w = new Date(startToday); w.setDate(w.getDate() - 7); return d >= w; }
      case "mes": return d >= new Date(now.getFullYear(), now.getMonth(), 1);
      case "ano": return d >= new Date(now.getFullYear(), 0, 1);
      default: return true;
    }
  };

  const filteredCards = cards.filter((c) => {
    // Busca
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!(c.title.toLowerCase().includes(q) || (c.client_name || "").toLowerCase().includes(q) || (c.person_name || "").toLowerCase().includes(q))) return false;
    }
    // Status
    if (fStatus === "abertos" && (isDoneCard(c) || isLostCard(c))) return false;
    if (fStatus === "ganhos" && !isDoneCard(c)) return false;
    if (fStatus === "perdidos" && !isLostCard(c)) return false;
    // Pós Vendas (responsável)
    if (fAssignee && String(c.assigned_to_id || "") !== fAssignee) return false;
    // Valor
    if (fValue) {
      const v = c.value || 0;
      if (fValue === "0-1000" && !(v <= 1000)) return false;
      if (fValue === "1000-5000" && !(v > 1000 && v <= 5000)) return false;
      if (fValue === "5000-10000" && !(v > 5000 && v <= 10000)) return false;
      if (fValue === "10000+" && !(v > 10000)) return false;
    }
    // Etiqueta
    if (fTag) {
      if (fTag === "atrasada" && c.pending_status !== "overdue") return false;
      if (fTag === "hoje" && c.pending_status !== "today") return false;
      if (fTag === "futura" && c.pending_status !== "future") return false;
      if (fTag === "sem" && (c.pending_count || 0) !== 0) return false;
      if (fTag === "parado" && !c.is_stuck_3d) return false;
    }
    // Criação (created_at)
    if (!inPeriod(c.created_at, fCriacao)) return false;
    // Fechamento (cards em etapa final, por updated_at)
    if (fFechamento) {
      if (!isDoneCard(c) && !isLostCard(c)) return false;
      if (!inPeriod(c.updated_at, fFechamento)) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="relative z-20 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50 lg:z-50">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {/* Lado esquerdo: Voltar + Nome do Board */}
          <div className="flex w-full items-center gap-4 sm:w-auto">
            <button
              onClick={() => navigate("/servicos")}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
              title="Voltar para Boards de Serviços"
            >
              <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${boardColor}20` }}>
                <BoardIcon size={24} style={{ color: boardColor }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{board.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito: Ações */}
          <div className="mt-1 flex w-full items-center justify-end gap-2 sm:mt-0 sm:w-auto sm:gap-3">
            {/* Busca expansível */}
            {showSearch ? (
              <div className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800/50 sm:w-auto">
                <Search size={18} className="text-slate-400 dark:text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cards..."
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-white sm:w-64"
                  onBlur={() => { if (!searchTerm) setShowSearch(false); }}
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(""); setShowSearch(false); }}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className={`rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${searchTerm ? "bg-violet-500/20 text-violet-400" : ""}`}
                title="Buscar cards"
              >
                <Search size={20} className={searchTerm ? "text-violet-400" : "text-slate-500 dark:text-slate-400"} />
              </button>
            )}

            {/* Botão Filtros */}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${showFilters || filtersActive ? "bg-violet-500/20 text-violet-400" : ""}`}
              title="Filtros"
            >
              <Filter size={20} className={showFilters || filtersActive ? "text-violet-400" : "text-slate-500 dark:text-slate-400"} />
            </button>

            {/* Botão Nova Lista */}
            {canManage && (
              <button
                onClick={handleCreateList}
                className="flex h-10 w-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-0 py-0 text-white shadow-lg transition-all hover:from-violet-600 hover:to-purple-600 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                title="Adicionar nova lista"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nova Lista</span>
              </button>
            )}

            {/* Menu do board — apenas admin */}
            {!isViewer && user?.role === "admin" && (
              <div className="relative">
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
                  title="Opções do board"
                >
                  <MoreVertical size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
                {showBoardMenu && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setShowBoardMenu(false)} />
                    <div className="absolute right-0 z-[110] mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
                      <button onClick={() => { setShowBoardMenu(false); setShowBoardEditModal(true); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Edit size={16} /> Editar Board
                      </button>
                      <button onClick={handleDuplicateBoard}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Copy size={16} /> Duplicar Board
                      </button>
                      <button onClick={handleArchiveBoard}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Archive size={16} /> Arquivar Board
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-slate-700/50">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Filtros:</span>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="abertos">Apenas Abertos</option>
              <option value="todos">Todos</option>
              <option value="ganhos">Apenas Ganhos</option>
              <option value="perdidos">Apenas Perdidos</option>
            </select>
            <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Todos os Pós Vendas</option>
              {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
            <select value={fValue} onChange={(e) => setFValue(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Qualquer valor</option>
              <option value="0-1000">R$ 0 - 1.000</option>
              <option value="1000-5000">R$ 1.000 - 5.000</option>
              <option value="5000-10000">R$ 5.000 - 10.000</option>
              <option value="10000+">R$ 10.000+</option>
            </select>
            <select value={fTag} onChange={(e) => setFTag(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Qualquer etiqueta</option>
              <option value="atrasada">🔴 Atividade Atrasada</option>
              <option value="hoje">🟢 Atividade para Hoje</option>
              <option value="futura">🟣 Atividade Futura</option>
              <option value="sem">⚪ Sem Atividade</option>
              <option value="parado">🔴 Parado 3d+</option>
            </select>
            <select value={fCriacao} onChange={(e) => setFCriacao(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Qualquer criação</option>
              <option value="hoje">Criado hoje</option>
              <option value="ontem">Criado ontem</option>
              <option value="semana">Criado esta semana</option>
              <option value="mes">Criado este mês</option>
              <option value="ano">Criado este ano</option>
            </select>
            <select value={fFechamento} onChange={(e) => setFFechamento(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Qualquer fechamento</option>
              <option value="hoje">Fechado hoje</option>
              <option value="semana">Fechado esta semana</option>
              <option value="mes">Fechado este mês</option>
              <option value="ano">Fechado este ano</option>
            </select>
            {filtersActive && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300">
                <X size={14} /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Área kanban */}
      <div
        ref={boardScrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={`scrollbar-hidden flex-1 overflow-x-auto overflow-y-hidden p-6 pb-20 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      >
        <div className="flex h-full gap-4">
          {lists.length > 0 ? (
            lists.map((list, idx) => {
              const listCards = filteredCards
                .filter((c) => c.list_id === list.id && !c.is_deleted)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
              return (
                <KanbanColumn
                  key={list.id}
                  list={list}
                  cards={listCards}
                  allLists={lists}
                  canManage={canManage}
                  isFirst={idx === 0}
                  isLast={idx === lists.length - 1}
                  onAddCard={() => handleAddCard(list.id)}
                  onEditList={() => handleEditList(list)}
                  onDeleteList={() => handleDeleteList(list)}
                  onMoveLeft={() => handleMoveListLeft(list)}
                  onMoveRight={() => handleMoveListRight(list)}
                  onOpenCard={handleOpenDetail}
                />
              );
            })
          ) : (
            <div className="flex w-80 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-slate-700/50 dark:bg-slate-800/30">
              <p className="mb-2 text-lg font-medium text-slate-500">Nenhuma lista encontrada</p>
              {canManage && (
                <button onClick={handleCreateList} className="mt-4 flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600">
                  <Plus size={16} /> Nova Lista
                </button>
              )}
            </div>
          )}
          <div className="w-1 flex-shrink-0" aria-hidden />
        </div>
      </div>

      {/* Modal de edição do board */}
      {showBoardEditModal && board && (
        <BoardEditModal
          board={board}
          onClose={() => setShowBoardEditModal(false)}
          onSuccess={(updated) => {
            setBoard({ ...board, ...updated });
            setShowBoardEditModal(false);
          }}
        />
      )}

      {/* Modal de lista */}
      {showListModal && (
        <ServiceListModal
          list={editingList}
          boardId={numId}
          onClose={() => setShowListModal(false)}
          onSuccess={() => { setShowListModal(false); loadData(); }}
        />
      )}

      {/* Modal de criar/editar card */}
      <ServiceCardModal
        isOpen={showCardModal}
        card={editingCard}
        lists={lists}
        defaultListId={selectedListId || lists[0]?.id || 0}
        onClose={() => setShowCardModal(false)}
        onSave={handleSaveCard}
      />

    </div>
  );
};

export default ServiceKanban;
