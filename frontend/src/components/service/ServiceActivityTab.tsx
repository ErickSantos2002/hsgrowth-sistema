import React, { useState, useRef } from "react";
import {
  Plus, Check, Trash2, Clock, Phone, CheckSquare, Mail, Users, FileText,
  StickyNote, ArrowRight, Package, User, Activity as ActivityIcon, Search,
  Download, Upload, X, Calendar,
} from "lucide-react";
import serviceActivityService, { ServiceCardActivity } from "../../services/serviceActivityService";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface TabProps {
  boardId: number;
  cardId: number;
  activities: ServiceCardActivity[];
  reload: () => Promise<void> | void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  call: { label: "Ligação", icon: <Phone size={14} />, color: "text-blue-400" },
  task: { label: "Tarefa", icon: <CheckSquare size={14} />, color: "text-green-400" },
  follow_up: { label: "Follow-up", icon: <Clock size={14} />, color: "text-yellow-400" },
  email: { label: "E-mail", icon: <Mail size={14} />, color: "text-orange-400" },
  meeting: { label: "Reunião", icon: <Users size={14} />, color: "text-sky-400" },
  other: { label: "Outro", icon: <ActivityIcon size={14} />, color: "text-slate-400" },
};

const TYPE_OPTIONS = ["call", "task", "follow_up", "email", "meeting", "other"];

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  normal: { label: "Normal", cls: "border-blue-500/30 bg-blue-500/20 text-blue-400" },
  high: { label: "Alta", cls: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400" },
  urgent: { label: "Urgente", cls: "border-red-500/30 bg-red-500/20 text-red-400" },
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

export const ServiceActivityTab: React.FC<TabProps> = ({ boardId, cardId, activities, reload }) => {
  const { confirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "call", title: "", description: "", date: "", time: "", priority: "normal" });
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

  const resetForm = () => setForm({ type: "call", title: "", description: "", date: "", time: "", priority: "normal" });

  const handleSave = async () => {
    if (!form.title.trim()) { showError("Informe um título"); return; }
    setSaving(true);
    try {
      let due_date: string | undefined;
      if (form.date) due_date = `${form.date}T${form.time || "09:00"}:00`;
      await serviceActivityService.create(boardId, cardId, {
        category: "atividade",
        activity_type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        due_date,
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

  const handleComplete = async (a: ServiceCardActivity) => {
    try {
      await serviceActivityService.complete(boardId, cardId, a.id, !a.is_completed);
      await reload();
    } catch { showError("Erro ao concluir atividade"); }
  };

  const handleDelete = async (a: ServiceCardActivity) => {
    const ok = await confirm({ title: "Remover", message: "Deseja remover este item?", confirmText: "Remover", isDanger: true });
    if (!ok) return;
    try {
      await serviceActivityService.remove(boardId, cardId, a.id);
      await reload();
    } catch { showError("Erro ao remover"); }
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
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 px-4 py-3 font-medium text-emerald-400 transition-colors hover:from-emerald-500/20 hover:to-emerald-600/20"
        >
          <Plus size={18} /> Adicionar Atividade
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 dark:text-white">Nova atividade</h4>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none">
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Prioridade</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none">
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Ligar para o cliente" autoFocus
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              placeholder="Detalhes da atividade..."
              className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
              <Check size={16} /> {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg bg-gray-200/50 dark:bg-slate-700/50 px-4 py-2 font-medium text-slate-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700">
              Cancelar
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
            {foco.map((a) => {
              const meta = TYPE_META[a.activity_type || "other"] || TYPE_META.other;
              const prio = PRIORITY_META[a.priority || "normal"];
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3">
                  <button onClick={() => handleComplete(a)} title="Concluir"
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-gray-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/20">
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={meta.color}>{meta.icon}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{a.title}</span>
                      {prio && <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${prio.cls}`}>{prio.label}</span>}
                    </div>
                    {a.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.description}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      {a.due_date && <span className="flex items-center gap-1"><Calendar size={12} /> {formatDateTime(a.due_date)}</span>}
                      {a.user_name && <span>• {a.user_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(a)} className="rounded p-1 text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              );
            })}
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
