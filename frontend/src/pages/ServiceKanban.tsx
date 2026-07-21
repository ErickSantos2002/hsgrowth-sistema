import React, { useRef, useState, useEffect, useMemo } from "react";
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
import { BaseModal, FormField, Input, Textarea, Button, LoadingSpinner, SelectMenu } from "../components/common";
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

const initialsOf = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

// Pilha de avatares dos colaboradores que agiram no card (modelo colaborativo)
const CollaboratorStack: React.FC<{ people: { id: number; name: string }[] }> = ({ people }) => {
  if (!people || people.length === 0) return null;
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5" title={people.map((p) => p.name).join(", ")}>
      {shown.map((p) => (
        <div key={p.id} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white bg-violet-500/30 text-[10px] font-semibold text-violet-300 dark:border-slate-800" title={p.name}>
          {initialsOf(p.name)}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white bg-slate-500/30 text-[10px] font-semibold text-slate-300 dark:border-slate-800">
          +{extra}
        </div>
      )}
    </div>
  );
};

const KanbanServiceCard: React.FC<KanbanCardProps> = ({ card, onOpenDetail }) => {
  const status = card.pending_status || "none";
  const stuck7d = !!card.is_stuck_7d;
  const stuck = !!card.is_stuck_3d && !stuck7d; // 7d+ tem prioridade (vermelho mais escuro)
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
        stuck7d ? "border-red-700/50 bg-white dark:border-red-600/40 dark:bg-red-950/40"
        : stuck ? "border-red-500/40 bg-white dark:border-red-500/30 dark:bg-red-950/20"
        : "border-gray-200 bg-white dark:border-slate-700/30 dark:bg-white/5"
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
        {card.business_info?.collection_type === "a_vencer" && <CardBadge cls="bg-blue-500/15 text-blue-600 dark:text-blue-300" icon={<Calendar size={11} />} label="A vencer" title="Cobrança de aparelhos a vencer" />}
        {card.business_info?.collection_type === "atrasados" && <CardBadge cls="bg-orange-500/15 text-orange-600 dark:text-orange-300" icon={<AlarmClock size={11} />} label="Atrasados" title="Cobrança de aparelhos atrasados" />}
        {stuck7d && <CardBadge cls="bg-red-800 text-red-100" icon={<AlarmClock size={11} />} label="Parado 7d+" title="Card sem movimentação há mais de 7 dias" />}
        {stuck && <CardBadge cls="bg-red-500/10 text-red-400 dark:text-red-300" icon={<AlarmClock size={11} />} label="Parado 3d+" title="Card sem movimentação há mais de 3 dias" />}
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

      {/* Rodapé: valor + colaboradores que participaram */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-green-500 dark:text-green-400">{card.value ? fmtValue(card.value) : ""}</span>
        <CollaboratorStack people={card.collaborators || []} />
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
        {/* Adicionar card só na lista inicial (primeira) — evita pular etapas */}
        {isFirst ? (
          <button
            onClick={onAddCard}
            className="group flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-500 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
          >
            <Plus size={16} className="transition-transform group-hover:scale-110" />
            Adicionar card
          </button>
        ) : (
          <div className="flex-1" />
        )}
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
  const [fProduct, setFProduct] = useState("");
  const [fCollection, setFCollection] = useState(""); // tipo de cobrança (só board 2)
  const [fVencMes, setFVencMes] = useState(""); // mês de vencimento "01".."12" (só board 2)
  const [fVencAno, setFVencAno] = useState(""); // ano de vencimento "2026" (só board 2)
  const [fValue, setFValue] = useState("");
  const [fTag, setFTag] = useState("");
  const [fCriacao, setFCriacao] = useState("");
  const [fCriacaoStart, setFCriacaoStart] = useState("");
  const [fCriacaoEnd, setFCriacaoEnd] = useState("");
  const [fFechamento, setFFechamento] = useState("");
  const [fFechamentoStart, setFFechamentoStart] = useState("");
  const [fFechamentoEnd, setFFechamentoEnd] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);

  const clearFilters = () => {
    setFStatus("abertos"); setFAssignee(""); setFProduct(""); setFCollection(""); setFVencMes(""); setFVencAno(""); setFValue(""); setFTag("");
    setFCriacao(""); setFCriacaoStart(""); setFCriacaoEnd("");
    setFFechamento(""); setFFechamentoStart(""); setFFechamentoEnd("");
  };
  const filtersActive = fStatus !== "abertos" || !!fAssignee || !!fProduct || !!fCollection || (!!fVencMes && !!fVencAno) || !!fValue || !!fTag || !!fCriacao || !!fFechamento;

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

  // Carrega filtros salvos (localStorage por board)
  useEffect(() => {
    if (!numId) return;
    try {
      const raw = localStorage.getItem(`service_kanban_filters_${numId}`);
      if (raw) {
        const s = JSON.parse(raw);
        setFStatus(s.fStatus ?? "abertos");
        setFAssignee(s.fAssignee ?? "");
        setFProduct(s.fProduct ?? "");
        setFCollection(s.fCollection ?? "");
        setFVencMes(s.fVencMes ?? "");
        setFVencAno(s.fVencAno ?? "");
        setFValue(s.fValue ?? "");
        setFTag(s.fTag ?? "");
        setFCriacao(s.fCriacao ?? "");
        setFCriacaoStart(s.fCriacaoStart ?? "");
        setFCriacaoEnd(s.fCriacaoEnd ?? "");
        setFFechamento(s.fFechamento ?? "");
        setFFechamentoStart(s.fFechamentoStart ?? "");
        setFFechamentoEnd(s.fFechamentoEnd ?? "");
      }
    } catch { /* ignora */ }
    setFiltersReady(true);
  }, [numId]);

  // Salva filtros quando mudam
  useEffect(() => {
    if (!numId || !filtersReady) return;
    const s = { fStatus, fAssignee, fProduct, fCollection, fVencMes, fVencAno, fValue, fTag, fCriacao, fCriacaoStart, fCriacaoEnd, fFechamento, fFechamentoStart, fFechamentoEnd };
    try { localStorage.setItem(`service_kanban_filters_${numId}`, JSON.stringify(s)); } catch { /* ignora */ }
  }, [numId, filtersReady, fStatus, fAssignee, fProduct, fCollection, fVencMes, fVencAno, fValue, fTag, fCriacao, fCriacaoStart, fCriacaoEnd, fFechamento, fFechamentoStart, fFechamentoEnd]);

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

  // Anos presentes nas datas de recalibração dos aparelhos (para o filtro de
  // vencimento). Só anos válidos (4 dígitos) — descarta lixo tipo "1-01-01".
  // Precisa ficar ANTES de qualquer return condicional (loading/board): hooks
  // não podem ser chamados condicionalmente.
  const anosVencimento = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => (c.business_info?.equipamentos || []).forEach((d) => {
      const nd = d?.next_recalibration_date || "";
      if (/^\d{4}-\d{2}/.test(nd)) set.add(nd.slice(0, 4));
    }));
    return Array.from(set).sort();
  }, [cards]);

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
      // Também busca no nº de série e no nº do módulo dos aparelhos do card.
      const eq = c.business_info?.equipamentos || [];
      const emAparelhos = eq.some((d) =>
        (d?.serial_number || "").toLowerCase().includes(q) ||
        (d?.alcohol_module || "").toLowerCase().includes(q)
      );
      if (!(
        c.title.toLowerCase().includes(q) ||
        (c.client_name || "").toLowerCase().includes(q) ||
        (c.person_name || "").toLowerCase().includes(q) ||
        emAparelhos
      )) return false;
    }
    // Status
    if (fStatus === "abertos" && (isDoneCard(c) || isLostCard(c))) return false;
    if (fStatus === "ganhos" && !isDoneCard(c)) return false;
    if (fStatus === "perdidos" && !isLostCard(c)) return false;
    // Pós Vendas (colaborador que agiu no card)
    if (fAssignee && !(c.collaborators || []).some((p) => String(p.id) === fAssignee)) return false;
    // Produto (card precisa ter o produto selecionado vinculado)
    if (fProduct && !(c.products || []).some((p) => String(p.id) === fProduct)) return false;
    // Tipo de cobrança (só board 2)
    if (fCollection) {
      const ct = c.business_info?.collection_type || "";
      if (fCollection === "sem" ? !!ct : ct !== fCollection) return false;
    }
    // Vencimento de aparelho (mês + ano): card aparece se ALGUM aparelho dele vence
    // nesse mês/ano. next_recalibration_date vem como "YYYY-MM-DD". Só filtra quando
    // mês E ano estão escolhidos.
    if (fVencMes && fVencAno) {
      const prefixo = `${fVencAno}-${fVencMes}`;
      const eq = c.business_info?.equipamentos || [];
      const algum = eq.some((d) => (d?.next_recalibration_date || "").startsWith(prefixo));
      if (!algum) return false;
    }
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
      if (fTag === "parado7" && !c.is_stuck_7d) return false;
    }
    // Criação (created_at)
    if (fCriacao === "custom") {
      if (fCriacaoStart && fCriacaoEnd) {
        const d = new Date(c.created_at);
        if (d < new Date(`${fCriacaoStart}T00:00:00`) || d > new Date(`${fCriacaoEnd}T23:59:59`)) return false;
      }
    } else if (!inPeriod(c.created_at, fCriacao)) return false;
    // Fechamento (cards em etapa final, por updated_at)
    if (fFechamento) {
      if (!isDoneCard(c) && !isLostCard(c)) return false;
      if (fFechamento === "custom") {
        if (fFechamentoStart && fFechamentoEnd) {
          const d = new Date(c.updated_at);
          if (d < new Date(`${fFechamentoStart}T00:00:00`) || d > new Date(`${fFechamentoEnd}T23:59:59`)) return false;
        }
      } else if (!inPeriod(c.updated_at, fFechamento)) return false;
    }
    return true;
  });

  // Responsável: só usuários com role "serviço" (Pós Vendas)
  const serviceUsers = users.filter((u) => u.role === "service");

  // Produtos para o filtro: distintos, montados a partir dos produtos dos cards do board
  const productOptions = Array.from(
    new Map(cards.flatMap((c) => c.products || []).map((p) => [p.id, p])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
                  placeholder="Buscar por nome, série ou módulo..."
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
            <div className="min-w-[150px]">
              <SelectMenu size="sm" value={fStatus} onChange={setFStatus} options={[
                { value: "abertos", label: "Apenas Abertos" },
                { value: "todos", label: "Todos" },
                { value: "ganhos", label: "Apenas Ganhos" },
                { value: "perdidos", label: "Apenas Perdidos" },
              ]} />
            </div>
            <div className="min-w-[170px]">
              <SelectMenu size="sm" value={fAssignee} onChange={setFAssignee} options={[
                { value: "", label: "Todos os Pós Vendas" },
                ...serviceUsers.map((u) => ({ value: String(u.id), label: u.name })),
              ]} />
            </div>
            <div className="min-w-[170px]">
              <SelectMenu size="sm" value={fProduct} onChange={setFProduct} options={[
                { value: "", label: "Qualquer produto" },
                ...productOptions.map((p) => ({ value: String(p.id), label: p.name })),
              ]} />
            </div>
            {numId === 2 && (
              <div className="min-w-[200px]">
                <SelectMenu size="sm" value={fCollection} onChange={setFCollection} options={[
                  { value: "", label: "Todos os tipos de cobrança" },
                  { value: "a_vencer", label: "🔵 Aparelhos a vencer" },
                  { value: "atrasados", label: "🟠 Aparelhos atrasados" },
                  { value: "sem", label: "Sem tipo de cobrança" },
                ]} />
              </div>
            )}
            {numId === 2 && (
              <div className="min-w-[150px]">
                <SelectMenu size="sm" value={fVencMes} onChange={setFVencMes} options={[
                  { value: "", label: "Vence no mês" },
                  { value: "01", label: "Janeiro" },
                  { value: "02", label: "Fevereiro" },
                  { value: "03", label: "Março" },
                  { value: "04", label: "Abril" },
                  { value: "05", label: "Maio" },
                  { value: "06", label: "Junho" },
                  { value: "07", label: "Julho" },
                  { value: "08", label: "Agosto" },
                  { value: "09", label: "Setembro" },
                  { value: "10", label: "Outubro" },
                  { value: "11", label: "Novembro" },
                  { value: "12", label: "Dezembro" },
                ]} />
              </div>
            )}
            {numId === 2 && (
              <div className="min-w-[110px]">
                <SelectMenu size="sm" value={fVencAno} onChange={setFVencAno} options={[
                  { value: "", label: "Ano" },
                  ...anosVencimento.map((a) => ({ value: a, label: a })),
                ]} />
              </div>
            )}
            <div className="min-w-[150px]">
              <SelectMenu size="sm" value={fValue} onChange={setFValue} options={[
                { value: "", label: "Qualquer valor" },
                { value: "0-1000", label: "R$ 0 - 1.000" },
                { value: "1000-5000", label: "R$ 1.000 - 5.000" },
                { value: "5000-10000", label: "R$ 5.000 - 10.000" },
                { value: "10000+", label: "R$ 10.000+" },
              ]} />
            </div>
            <div className="min-w-[180px]">
              <SelectMenu size="sm" value={fTag} onChange={setFTag} options={[
                { value: "", label: "Qualquer etiqueta" },
                { value: "atrasada", label: "🔴 Atividade Atrasada" },
                { value: "hoje", label: "🟢 Atividade para Hoje" },
                { value: "futura", label: "🟣 Atividade Futura" },
                { value: "sem", label: "⚪ Sem Atividade" },
                { value: "parado", label: "🔴 Parado 3d+" },
                { value: "parado7", label: "🟥 Parado 7d+" },
              ]} />
            </div>
            <div className="min-w-[160px]">
              <SelectMenu size="sm" value={fCriacao} onChange={(v) => { setFCriacao(v); if (v !== "custom") { setFCriacaoStart(""); setFCriacaoEnd(""); } }} options={[
                { value: "", label: "Qualquer criação" },
                { value: "hoje", label: "Criado hoje" },
                { value: "ontem", label: "Criado ontem" },
                { value: "semana", label: "Criado esta semana" },
                { value: "mes", label: "Criado este mês" },
                { value: "ano", label: "Criado este ano" },
                { value: "custom", label: "Período personalizado" },
              ]} />
            </div>
            {fCriacao === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={fCriacaoStart} max={fCriacaoEnd || undefined} onChange={(e) => setFCriacaoStart(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                <span className="text-xs text-slate-400">até</span>
                <input type="date" value={fCriacaoEnd} min={fCriacaoStart || undefined} onChange={(e) => setFCriacaoEnd(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </div>
            )}
            <div className="min-w-[170px]">
              <SelectMenu size="sm" value={fFechamento} onChange={(v) => { setFFechamento(v); if (v !== "custom") { setFFechamentoStart(""); setFFechamentoEnd(""); } }} options={[
                { value: "", label: "Qualquer fechamento" },
                { value: "hoje", label: "Fechado hoje" },
                { value: "semana", label: "Fechado esta semana" },
                { value: "mes", label: "Fechado este mês" },
                { value: "ano", label: "Fechado este ano" },
                { value: "custom", label: "Período personalizado" },
              ]} />
            </div>
            {fFechamento === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={fFechamentoStart} max={fFechamentoEnd || undefined} onChange={(e) => setFFechamentoStart(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                <span className="text-xs text-slate-400">até</span>
                <input type="date" value={fFechamentoEnd} min={fFechamentoStart || undefined} onChange={(e) => setFFechamentoEnd(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </div>
            )}
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
