import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Plus, Check, Trash2, Clock, Phone, CheckSquare, Mail, Users, FileText,
  StickyNote, ArrowRight, Package, User, Activity as ActivityIcon, Search,
  Download, Upload, X, Calendar, MessageCircle, Linkedin, MapPin, Video,
  MoreHorizontal, Save, Edit, ChevronDown, ChevronRight, Loader2, MailX,
} from "lucide-react";
import serviceActivityService, { ServiceCardActivity } from "../../services/serviceActivityService";
import api4comService from "../../services/api4comService";
import { Person } from "../../services/personService";
import { showSuccess, showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface TabProps {
  boardId: number;
  cardId: number;
  activities: ServiceCardActivity[];
  reload: () => Promise<void> | void;
  /** Pessoa vinculada ao card — usada para a ligação e exibição do telefone no Foco. */
  contact?: Person | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  call: { label: "Ligação", icon: <Phone size={14} />, color: "text-blue-400" },
  task: { label: "Tarefa", icon: <CheckSquare size={14} />, color: "text-green-400" },
  follow_up: { label: "Follow Up", icon: <Clock size={14} />, color: "text-yellow-400" },
  email: { label: "E-mail", icon: <Mail size={14} />, color: "text-orange-400" },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle size={14} />, color: "text-emerald-400" },
  linkedin: { label: "LinkedIn", icon: <Linkedin size={14} />, color: "text-sky-400" },
  meeting: { label: "Reunião", icon: <Users size={14} />, color: "text-sky-400" },
  other: { label: "Outro", icon: <MoreHorizontal size={14} />, color: "text-slate-400" },
};

// Tipos exibidos como botões no formulário (igual ao board de vendas)
const ACTIVITY_TYPES: { type: string; label: string; icon: React.ReactNode }[] = [
  { type: "call", label: "Ligação", icon: <Phone size={16} /> },
  { type: "task", label: "Tarefa", icon: <CheckSquare size={16} /> },
  { type: "follow_up", label: "Follow Up", icon: <Clock size={16} /> },
  { type: "email", label: "E-mail", icon: <Mail size={16} /> },
  { type: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={16} /> },
  { type: "linkedin", label: "LinkedIn", icon: <Linkedin size={16} /> },
  { type: "other", label: "Outro", icon: <MoreHorizontal size={16} /> },
];

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  normal: { label: "Normal", cls: "border-blue-500/30 bg-blue-500/20 text-blue-400" },
  high: { label: "Alta", cls: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400" },
  urgent: { label: "Urgente", cls: "border-red-500/30 bg-red-500/20 text-red-400" },
};

const UNSELECTED_BTN = "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700";

const typeBtnClasses = (type: string, selected: boolean): string => {
  if (!selected) return UNSELECTED_BTN;
  const map: Record<string, string> = {
    call: "bg-blue-500/30 text-slate-900 dark:text-blue-400 border-blue-500",
    task: "bg-green-500/30 text-slate-900 dark:text-green-400 border-green-500",
    follow_up: "bg-yellow-500/30 text-slate-900 dark:text-yellow-400 border-yellow-500",
    email: "bg-orange-500/30 text-slate-900 dark:text-orange-400 border-orange-500",
    whatsapp: "bg-emerald-500/30 text-slate-900 dark:text-emerald-400 border-emerald-500",
    linkedin: "bg-sky-500/30 text-slate-900 dark:text-sky-400 border-sky-500",
    other: "bg-slate-500/30 text-slate-900 dark:text-slate-400 border-gray-400 dark:border-slate-500",
  };
  return map[type] ?? UNSELECTED_BTN;
};

const priorityBtnClasses = (priority: string, selected: boolean): string => {
  if (!selected) return UNSELECTED_BTN;
  const map: Record<string, string> = {
    normal: "bg-blue-500/30 text-slate-900 dark:text-blue-300 border-blue-500",
    high: "bg-yellow-500/30 text-slate-900 dark:text-yellow-400 border-yellow-500",
    urgent: "bg-red-500/30 text-slate-900 dark:text-red-400 border-red-500",
  };
  return map[priority] ?? UNSELECTED_BTN;
};

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowStr = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getPhones = (contact?: Person | null): { label: string; number: string }[] => {
  if (!contact) return [];
  const list = [
    contact.phone && { label: "Principal", number: contact.phone },
    contact.phone_whatsapp && { label: "WhatsApp", number: contact.phone_whatsapp },
    contact.phone_commercial && { label: "Comercial", number: contact.phone_commercial },
    contact.phone_alternative && { label: "Alternativo", number: contact.phone_alternative },
    contact.phone_extra1 && { label: "Extra 1", number: contact.phone_extra1 },
    contact.phone_extra2 && { label: "Extra 2", number: contact.phone_extra2 },
  ].filter(Boolean) as { label: string; number: string }[];
  return list;
};

const dueBadge = (due?: string): { label: string; cls: string } | null => {
  if (!due) return null;
  const d = new Date(due);
  const now = new Date();
  if (now.toDateString() === d.toDateString()) return { label: "HOJE", cls: "border-emerald-500/40 bg-emerald-500/20 text-emerald-400" };
  if (d.getTime() < now.getTime()) return { label: "ATRASADO", cls: "border-red-500/40 bg-red-500/20 text-red-400" };
  return { label: "AGENDADO", cls: "border-blue-500/40 bg-blue-500/20 text-blue-400" };
};

// Estilos dos botões de confirmação por tipo
const BTN_BASE = "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
const GREEN_BTN = `${BTN_BASE} border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`;
const EMERALD_BTN = GREEN_BTN;
const RED_BTN = `${BTN_BASE} border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20`;
const ORANGE_BTN = `${BTN_BASE} border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20`;
const GRAY_BTN = `${BTN_BASE} border-slate-400/40 bg-slate-400/10 text-slate-400 hover:bg-slate-400/20`;

// ─── Item do Foco (estilo board de vendas) ───────────────────────────────────────

const FocoItem: React.FC<{
  activity: ServiceCardActivity;
  boardId: number;
  cardId: number;
  contact?: Person | null;
  onChanged: () => Promise<void> | void;
}> = ({ activity, boardId, cardId, contact, onChanged }) => {
  const { confirm } = useConfirm();
  const [expanded, setExpanded] = useState(true);
  const [calling, setCalling] = useState(false);
  const [showPhones, setShowPhones] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: activity.title || "", description: activity.description || "" });
  const [rescheduling, setRescheduling] = useState(false);
  const [reForm, setReForm] = useState({
    date: activity.due_date ? activity.due_date.substring(0, 10) : todayStr(),
    time: activity.due_date ? new Date(activity.due_date).toTimeString().substring(0, 5) : nowStr(),
  });

  const meta = TYPE_META[activity.activity_type || "other"] || TYPE_META.other;
  const prio = PRIORITY_META[activity.priority || "normal"];
  const phones = getPhones(contact);
  const badge = dueBadge(activity.due_date);
  const md = activity.activity_metadata || {};

  const doCall = async (phone: string) => {
    setShowPhones(false);
    setCalling(true);
    try {
      const r = await api4comService.makeCall({ phone, service_card_id: cardId });
      if (r.success) showSuccess("Chamada iniciada! O webphone abrirá automaticamente.");
      else showError(`Erro ao iniciar chamada: ${r.error || r.message}`);
    } catch (e: any) {
      showError(`Erro ao iniciar chamada: ${e.response?.data?.detail || e.message}`);
    } finally {
      setCalling(false);
    }
  };

  const handleCall = () => {
    if (phones.length === 0) { showWarning("Nenhum telefone na pessoa vinculada"); return; }
    if (phones.length === 1) { doCall(phones[0].number); return; }
    setShowPhones(true);
  };

  const isCall = activity.activity_type === "call";

  const markResult = async (isValid: boolean) => {
    try { await serviceActivityService.complete(boardId, cardId, activity.id, true, isValid); await onChanged(); }
    catch { showError("Erro ao registrar resultado"); }
  };

  const conclude = async () => {
    try { await serviceActivityService.complete(boardId, cardId, activity.id, true); await onChanged(); }
    catch { showError("Erro ao concluir"); }
  };

  const primaryEmail = contact?.email || contact?.email_commercial || contact?.email_personal;
  const whatsappNumber = contact?.phone_whatsapp || contact?.phone;

  const openEmail = () => {
    if (!primaryEmail) { showWarning("Pessoa sem e-mail cadastrado"); return; }
    window.open(`mailto:${primaryEmail}`, "_blank");
  };
  const openWhatsapp = () => {
    if (!whatsappNumber) { showWarning("Pessoa sem WhatsApp cadastrado"); return; }
    window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`, "_blank");
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) { showWarning("Informe um título"); return; }
    try {
      await serviceActivityService.update(boardId, cardId, activity.id, { title: editForm.title.trim(), description: editForm.description.trim() });
      setEditing(false); await onChanged();
    } catch { showError("Erro ao salvar"); }
  };

  const saveReschedule = async () => {
    if (!reForm.date) { showWarning("Selecione a data"); return; }
    try {
      await serviceActivityService.update(boardId, cardId, activity.id, { due_date: `${reForm.date}T${reForm.time || "09:00"}:00` });
      setRescheduling(false); await onChanged();
    } catch { showError("Erro ao reagendar"); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "Remover atividade", message: "Deseja remover esta atividade?", confirmText: "Remover", isDanger: true });
    if (!ok) return;
    try { await serviceActivityService.remove(boardId, cardId, activity.id); await onChanged(); }
    catch { showError("Erro ao remover"); }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={meta.color}>{meta.icon}</span>
          <span className="truncate font-medium text-slate-900 dark:text-white">{activity.title}</span>
          {prio && <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${prio.cls}`}>{prio.label}</span>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="hidden rounded-md border border-gray-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline">{meta.label}</span>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-3">
          {/* Data / responsável */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {badge && <span className={`rounded border px-1.5 py-0.5 font-medium ${badge.cls}`}>{badge.label}</span>}
            {activity.due_date && <span>{formatDateTime(activity.due_date)}</span>}
            {activity.user_name && <span>• {activity.user_name}</span>}
          </div>

          {activity.description && <p className="text-sm text-slate-600 dark:text-slate-300">{activity.description}</p>}
          {md.notes && <p className="text-xs text-slate-400">📝 {md.notes}</p>}
          {md.location && <p className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={12} /> {md.location}</p>}
          {md.video_link && <a href={md.video_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline"><Video size={12} /> Link da videochamada</a>}

          {/* Telefone — só em atividades de ligação */}
          {isCall && phones.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/40">
              <Phone size={14} className="text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {phones[0].number}{phones.length > 1 ? ` (+${phones.length - 1})` : ""}
              </span>
            </div>
          )}

          {/* Edição inline */}
          {editing ? (
            <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2">
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-2 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} placeholder="Descrição..."
                className="w-full resize-none rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-2 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/30"><Check size={14} /> Salvar</button>
                <button onClick={() => setEditing(false)} className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-300"><X size={14} /> Cancelar</button>
              </div>
            </div>
          ) : rescheduling ? (
            <div className="space-y-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={reForm.date} onChange={(e) => setReForm({ ...reForm, date: e.target.value })}
                  className="rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-2 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                <input type="time" value={reForm.time} onChange={(e) => setReForm({ ...reForm, time: e.target.value })}
                  className="rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-2 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveReschedule} className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/30"><Check size={14} /> Reagendar</button>
                <button onClick={() => setRescheduling(false)} className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-300"><X size={14} /> Cancelar</button>
              </div>
            </div>
          ) : (
            /* Ações — confirmação específica por tipo de atividade */
            <div className="flex items-center gap-2">
              {/* Ação principal por tipo (ligar / e-mail / whatsapp) */}
              {isCall && (
                <button onClick={handleCall} disabled={calling} title="Ligar"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60">
                  {calling ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                </button>
              )}

              {/* Botões de confirmação por tipo */}
              {isCall && (
                <>
                  <button onClick={() => markResult(true)} className={GREEN_BTN}><Check size={16} /> Válido</button>
                  <button onClick={() => markResult(false)} className={RED_BTN}><X size={16} /> Não Válido</button>
                </>
              )}
              {activity.activity_type === "email" && (
                <>
                  <button onClick={openEmail} className={ORANGE_BTN}><Mail size={16} /> Enviar E-mail</button>
                  <button onClick={() => markResult(true)} className={GREEN_BTN}><Check size={16} /> Já enviado</button>
                  <button onClick={() => markResult(false)} className={GRAY_BTN}><MailX size={16} /> Sem e-mail</button>
                </>
              )}
              {activity.activity_type === "whatsapp" && (
                <>
                  <button onClick={openWhatsapp} className={EMERALD_BTN}><MessageCircle size={16} /> Abrir WhatsApp</button>
                  <button onClick={() => markResult(true)} className={GREEN_BTN}><Check size={16} /> Respondeu</button>
                  <button onClick={() => markResult(false)} className={GRAY_BTN}><X size={16} /> Sem resposta</button>
                </>
              )}
              {activity.activity_type === "meeting" && (
                <>
                  <button onClick={() => markResult(true)} className={GREEN_BTN}><Check size={16} /> Realizada</button>
                  <button onClick={() => markResult(false)} className={RED_BTN}><X size={16} /> Não realizada</button>
                </>
              )}
              {!isCall && !["email", "whatsapp", "meeting"].includes(activity.activity_type || "") && (
                <button onClick={conclude} className={GREEN_BTN}><Check size={16} /> Concluir</button>
              )}

              {/* Ações comuns */}
              <button onClick={() => setEditing(true)} title="Editar" className="flex-shrink-0 rounded-lg border border-blue-500/40 bg-blue-500/10 p-2 text-blue-400 transition-colors hover:bg-blue-500/20"><Edit size={16} /></button>
              <button onClick={() => setRescheduling(true)} title="Reagendar" className="flex-shrink-0 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-2 text-yellow-400 transition-colors hover:bg-yellow-500/20"><Calendar size={16} /></button>
              <button onClick={handleDelete} title="Remover" className="flex-shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"><Trash2 size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Modal de seleção de telefone (quando 2+ números) */}
      {showPhones && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowPhones(false)}>
          <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Escolha o número</h3>
              <button onClick={() => setShowPhones(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-2 p-4">
              {phones.map((p) => (
                <button key={p.label + p.number} onClick={() => doCall(p.number)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-400">{p.label}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.number}</p>
                  </div>
                  <Phone size={16} className="text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return `${d} dia${d > 1 ? "s" : ""} atrás`;
  }
  return date.toLocaleDateString("pt-BR");
};

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Avatar: React.FC<{ name?: string }> = ({ name }) => {
  const initials = (name || "Sistema")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-400">
      {initials}
    </div>
  );
};

const changeIcon = (type?: string): React.ReactNode => {
  switch (type) {
    case "stage_change": return <ArrowRight size={16} className="text-blue-400" />;
    case "product_added":
    case "product_removed": return <Package size={16} className="text-violet-400" />;
    case "client_linked":
    case "client_unlinked":
    case "person_linked":
    case "person_unlinked": return <User size={16} className="text-amber-400" />;
    case "card_title_changed": return <FileText size={16} className="text-slate-400" />;
    case "card_created": return <Plus size={16} className="text-emerald-400" />;
    default: return <ActivityIcon size={16} className="text-slate-400" />;
  }
};

// ─── Aba Atividade (Adicionar + Foco + Histórico) ────────────────────────────────

type HistoryFilter = "todos" | "atividade" | "anotacao" | "arquivo" | "alteracao";

export const ServiceActivityTab: React.FC<TabProps> = ({ boardId, cardId, activities, reload, contact }) => {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "", title: "", date: todayStr(), time: nowStr(), duration: "30",
    priority: "normal", description: "", notes: "", location: "", video_link: "",
  });
  const [histFilter, setHistFilter] = useState<HistoryFilter>("todos");
  const [search, setSearch] = useState("");

  const foco = activities.filter((a) => a.category === "atividade" && !a.is_completed);
  const history = activities.filter((a) => {
    if (histFilter !== "todos" && a.category !== histFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    todos: activities.length,
    atividade: activities.filter((a) => a.category === "atividade").length,
    anotacao: activities.filter((a) => a.category === "anotacao").length,
    arquivo: activities.filter((a) => a.category === "arquivo").length,
    alteracao: activities.filter((a) => a.category === "alteracao").length,
  };

  const resetForm = () => setForm({
    type: "", title: "", date: todayStr(), time: nowStr(), duration: "30",
    priority: "normal", description: "", notes: "", location: "", video_link: "",
  });

  const openForm = () => { resetForm(); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { showError("Informe um título"); return; }
    setSaving(true);
    try {
      let due_date: string | undefined;
      if (form.date) due_date = `${form.date}T${form.time || "09:00"}:00`;
      const meta: Record<string, any> = {};
      if (form.duration) meta.duration_minutes = parseInt(form.duration) || undefined;
      if (form.notes.trim()) meta.notes = form.notes.trim();
      if (form.location.trim()) meta.location = form.location.trim();
      if (form.video_link.trim()) meta.video_link = form.video_link.trim();
      await serviceActivityService.create(boardId, cardId, {
        category: "atividade",
        activity_type: form.type || "other",
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        due_date,
        activity_metadata: Object.keys(meta).length ? meta : undefined,
      });
      resetForm();
      setShowForm(false);
      await reload();
      showSuccess("Atividade adicionada!");
    } catch {
      showError("Erro ao adicionar atividade");
    } finally {
      setSaving(false);
    }
  };

  const HIST_TABS: { key: HistoryFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "atividade", label: "Atividades" },
    { key: "anotacao", label: "Anotações" },
    { key: "arquivo", label: "Arquivos" },
    { key: "alteracao", label: "Alterações" },
  ];

  return (
    <div className="space-y-6">
      {/* Adicionar Atividade */}
      {!showForm ? (
        <button
          onClick={openForm}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 font-medium text-slate-900 dark:text-emerald-300 transition-colors hover:bg-emerald-500/25"
        >
          <Plus size={18} /> Adicionar Atividade
        </button>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          {/* Título */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Título da atividade *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título da atividade..." autoFocus
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Tipo de atividade */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Tipo de atividade</label>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
              {ACTIVITY_TYPES.map((t) => (
                <button key={t.type} onClick={() => setForm({ ...form, type: t.type })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${typeBtnClasses(t.type, form.type === t.type)}`}>
                  {t.icon}
                  <span className="hidden lg:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data, Hora e Duração */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Duração (min)</label>
              <input type="number" min="5" step="5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setForm({ ...form, priority: "normal" })} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${priorityBtnClasses("normal", form.priority === "normal")}`}>Normal</button>
              <button onClick={() => setForm({ ...form, priority: "high" })} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${priorityBtnClasses("high", form.priority === "high")}`}>Alta</button>
              <button onClick={() => setForm({ ...form, priority: "urgent" })} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${priorityBtnClasses("urgent", form.priority === "urgent")}`}>Urgente</button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              placeholder="Descreva a atividade..."
              className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Notas adicionais */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Notas adicionais (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              placeholder="Adicionar notas extras..."
              className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Opções adicionais */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Opções adicionais</label>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Adicionar localização..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Video size={16} className="text-slate-400" />
              <input type="url" value={form.video_link} onChange={(e) => setForm({ ...form, video_link: e.target.value })}
                placeholder="Link da videochamada (Google Meet, Zoom, etc.)"
                className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700">
              <X size={18} /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              <Save size={18} /> {saving ? "Salvando..." : "Salvar atividade"}
            </button>
          </div>
        </div>
      )}

      {/* Foco */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Foco</h3>
        {foco.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 py-6 text-center text-sm text-slate-400">Nenhuma atividade pendente</p>
        ) : (
          <div className="space-y-2">
            {foco.map((a) => (
              <FocoItem key={a.id} activity={a} boardId={boardId} cardId={cardId} contact={contact} onChanged={reload} />
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Histórico</h3>
        <div className="mb-3 flex flex-wrap gap-1 border-b border-gray-200 dark:border-slate-700/50">
          {HIST_TABS.map((t) => (
            <button key={t.key} onClick={() => setHistFilter(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${histFilter === t.key ? "border-violet-500 text-violet-500 dark:text-violet-400" : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
              {t.label}
              <span className="rounded-full bg-gray-200 px-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no histórico..."
            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-2 pl-10 pr-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700 py-10 text-center">
            <ActivityIcon size={28} className="mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Nenhum evento nesta categoria</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((a) => <HistoryItem key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryItem: React.FC<{ a: ServiceCardActivity }> = ({ a }) => {
  let icon: React.ReactNode;
  let title: string;
  if (a.category === "alteracao") { icon = changeIcon(a.activity_type); title = a.description || "Alteração"; }
  else if (a.category === "anotacao") { icon = <StickyNote size={16} className="text-purple-400" />; title = "Anotação"; }
  else if (a.category === "arquivo") { icon = <FileText size={16} className="text-blue-400" />; title = `Arquivo: ${a.file_name || a.title}`; }
  else {
    const meta = TYPE_META[a.activity_type || "other"] || TYPE_META.other;
    icon = <span className={meta.color}>{meta.icon}</span>;
    title = `${meta.label}: ${a.title || ""}`;
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/40 p-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 dark:text-white">{title}</p>
        {a.category !== "alteracao" && a.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{a.description}</p>}
        <p className="mt-1 text-xs text-slate-400">{formatTimeAgo(a.created_at)}{a.user_name ? ` • ${a.user_name}` : " • Sistema"}</p>
      </div>
      <Avatar name={a.user_name} />
    </div>
  );
};

// ─── Aba Anotações ───────────────────────────────────────────────────────────────

export const ServiceNotesTab: React.FC<TabProps> = ({ boardId, cardId, activities, reload }) => {
  const { confirm } = useConfirm();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const notes = activities.filter((a) => a.category === "anotacao");

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await serviceActivityService.create(boardId, cardId, { category: "anotacao", description: content.trim() });
      setContent("");
      await reload();
      showSuccess("Anotação adicionada!");
    } catch { showError("Erro ao adicionar anotação"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: "Remover anotação", message: "Deseja remover esta anotação?", confirmText: "Remover", isDanger: true });
    if (!ok) return;
    try { await serviceActivityService.remove(boardId, cardId, id); await reload(); }
    catch { showError("Erro ao remover"); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Escreva uma anotação..."
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
        <button onClick={handleAdd} disabled={saving || !content.trim()} className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
          <Plus size={16} /> {saving ? "Salvando..." : "Adicionar anotação"}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhuma anotação ainda</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-white">{n.description}</p>
                <button onClick={() => handleDelete(n.id)} className="flex-shrink-0 rounded p-1 text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button>
              </div>
              <p className="mt-2 text-xs text-slate-400">{formatTimeAgo(n.created_at)}{n.user_name ? ` • ${n.user_name}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Aba Arquivos ────────────────────────────────────────────────────────────────

export const ServiceFilesTab: React.FC<TabProps> = ({ boardId, cardId, activities, reload }) => {
  const { confirm } = useConfirm();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = activities.filter((a) => a.category === "arquivo");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError("Arquivo muito grande (máx. 10MB)"); return; }
    setUploading(true);
    try {
      await serviceActivityService.uploadFile(boardId, cardId, file);
      await reload();
      showSuccess("Arquivo enviado!");
    } catch { showError("Erro ao enviar arquivo"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const handleDownload = async (a: ServiceCardActivity) => {
    try { await serviceActivityService.downloadFile(boardId, cardId, a.id, a.file_name || "arquivo"); }
    catch { showError("Erro ao baixar arquivo"); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: "Remover arquivo", message: "Deseja remover este arquivo?", confirmText: "Remover", isDanger: true });
    if (!ok) return;
    try { await serviceActivityService.remove(boardId, cardId, id); await reload(); }
    catch { showError("Erro ao remover"); }
  };

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 px-4 py-6 text-center transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:cursor-wait">
        <Upload size={22} className="text-slate-400 group-hover:text-emerald-400" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-emerald-400">{uploading ? "Enviando..." : "Anexar arquivo"}</p>
        <p className="text-xs text-slate-400">Máximo 10MB</p>
      </button>
      {files.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum arquivo anexado</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
              <FileText size={20} className="flex-shrink-0 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{f.file_name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(f.file_size)}{f.user_name ? ` • ${f.user_name}` : ""} • {formatTimeAgo(f.created_at)}</p>
              </div>
              <button onClick={() => handleDownload(f)} className="rounded p-1.5 text-slate-400 hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white" title="Baixar"><Download size={16} /></button>
              <button onClick={() => handleDelete(f.id)} className="rounded p-1.5 text-red-400 hover:bg-red-500/10" title="Remover"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
