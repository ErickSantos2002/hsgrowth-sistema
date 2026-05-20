import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Loader2,
  MonitorPlay,
  ExternalLink,
  BrainCircuit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Trash2,
  Calendar,
  Copy,
  Pencil,
  CalendarX,
} from "lucide-react";
import cardTaskService, { CardTask } from "../../services/cardTaskService";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../context/AuthContext";
import {
  formatBrazilDate,
  convertBrazilToUTC,
} from "../../utils/timezone";
import BaseModal from "../common/BaseModal";

interface MeetingSectionProps {
  cardId: number;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
  /** Chamado após ações que movem o card (ex: NoShow) para atualizar o pipeline */
  onCardUpdate?: () => void;
}

interface TranscriptAnalysis {
  resumo: string;
  sentimento: "positivo" | "neutro" | "negativo";
  interesse_cliente: "alto" | "médio" | "baixo";
  objecoes: string[];
  proximos_passos: string[];
  pontos_de_atencao: string[];
}

interface NewMeetingForm {
  title: string;
  date: string;
  time: string;
  duration: string;
  contact_name: string;
  description: string;
}

const EMPTY_FORM: NewMeetingForm = {
  title: "",
  date: "",
  time: "",
  duration: "30",
  contact_name: "",
  description: "",
};

const MeetingSection: React.FC<MeetingSectionProps> = ({ cardId, onCountChange, readOnly, onCardUpdate }) => {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "manager";
  const [meetings, setMeetings] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showTranscriptIds, setShowTranscriptIds] = useState<Set<number>>(new Set());

  // Modal nova reunião
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Modal editar reunião
  const [editingMeeting, setEditingMeeting] = useState<CardTask | null>(null);
  const [editForm, setEditForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // Loading states
  const [teamsLoadingId, setTeamsLoadingId] = useState<number | null>(null);
  const [transcriptLoadingId, setTranscriptLoadingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadMeetings = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const result = await cardTaskService.list({
        card_id: cardId,
        task_type: "meeting",
        page_size: 100,
      });
      setMeetings(result.tasks);
      const pendingCount = result.tasks.filter((m) => !m.is_completed).length;
      onCountChange?.(pendingCount);
    } catch {
      // silencioso
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(true);
  }, [cardId]);

  const pending = meetings.filter((m) => !m.is_completed && !m.is_cancelled);
  const completed = meetings.filter((m) => m.is_completed && !m.is_cancelled);
  const cancelled = meetings.filter((m) => m.is_cancelled);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.date || !form.time) {
      showError("Título, data e hora são obrigatórios");
      return;
    }
    try {
      setSaving(true);
      const dueDateUTC = convertBrazilToUTC(form.date, form.time);
      const created = await cardTaskService.create({
        card_id: cardId,
        title: form.title.trim(),
        task_type: "meeting",
        due_date: dueDateUTC,
        duration_minutes: parseInt(form.duration) || 30,
        contact_name: form.contact_name.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);

      // Cria automaticamente o evento no calendário Teams
      try {
        await cardTaskService.createTeamsMeeting(created.id);
        showSuccess("Reunião criada e agendada no calendário!");
      } catch {
        // Se falhar (ex: usuário sem MS token), avisa mas não bloqueia
        showSuccess("Reunião criada! Ative o link Teams manualmente se necessário.");
      }

      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao criar reunião");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    const ok = await confirm({
      title: "Concluir reunião?",
      message: "Confirma que a reunião foi realizada com sucesso?",
      confirmText: "Sim, concluir",
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.toggleComplete(id, true);
      showSuccess("Reunião marcada como concluída!");
      await loadMeetings();
    } catch {
      showError("Erro ao concluir reunião");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNoShow = async (id: number) => {
    const ok = await confirm({
      title: "Marcar como No-Show?",
      message: "O contato não compareceu à reunião?",
      confirmText: "Sim, No-Show",
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.markNoShow(id);
      showSuccess("Reunião marcada como No-Show.");
      await loadMeetings();
      // Notifica o KanbanBoard para mover o card visualmente (sem F5)
      window.dispatchEvent(new CustomEvent('crm:card-moved'));
      // Atualiza o card completo (list_id) para o PipelineStages refletir a nova etapa
      onCardUpdate?.();
    } catch {
      showError("Erro ao marcar No-Show");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Excluir reunião?",
      message: "Esta ação apaga o registro permanentemente. Não pode ser desfeita.",
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!ok) return;
    try {
      setActionLoadingId(id);
      await cardTaskService.delete(id);
      showSuccess("Reunião excluída.");
      await loadMeetings();
    } catch {
      showError("Erro ao excluir reunião");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelTeams = async (meeting: CardTask) => {
    const ok = await confirm({
      title: "Cancelar reunião?",
      message: meeting.teams_join_url
        ? "O evento será removido da agenda do Teams/Outlook. Esta ação não pode ser desfeita."
        : "A reunião não possui evento no Teams. Deseja apenas remover os dados de reunião?",
      confirmText: "Sim, cancelar",
      isDanger: true,
    });
    if (!ok) return;
    try {
      setActionLoadingId(meeting.id);
      await cardTaskService.cancelTeamsMeeting(meeting.id);
      showSuccess("Reunião cancelada e removida da agenda.");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao cancelar reunião no Teams");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (meeting: CardTask) => {
    if (meeting.due_date) {
      const d = new Date(meeting.due_date);
      const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
      const date = local.toISOString().slice(0, 10);
      const time = local.toISOString().slice(11, 16);
      setEditForm({
        title: meeting.title || "",
        date,
        time,
        duration: String(meeting.duration_minutes || 30),
        contact_name: meeting.contact_name || "",
        description: meeting.description || "",
      });
    } else {
      setEditForm({ ...EMPTY_FORM, title: meeting.title || "" });
    }
    setEditingMeeting(meeting);
  };

  const handleSaveEdit = async () => {
    if (!editingMeeting) return;
    if (!editForm.title.trim() || !editForm.date || !editForm.time) {
      showError("Título, data e hora são obrigatórios");
      return;
    }
    try {
      setSavingEdit(true);
      const dueDateUTC = convertBrazilToUTC(editForm.date, editForm.time);
      await cardTaskService.update(editingMeeting.id, {
        title: editForm.title.trim(),
        due_date: dueDateUTC,
        duration_minutes: parseInt(editForm.duration) || 30,
        contact_name: editForm.contact_name.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });
      showSuccess("Reunião atualizada!");
      setEditingMeeting(null);
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao atualizar reunião");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateTeamsMeeting = async (id: number) => {
    try {
      setTeamsLoadingId(id);
      await cardTaskService.createTeamsMeeting(id);
      showSuccess("Reunião criada no Teams! Link salvo.");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao criar reunião no Teams");
    } finally {
      setTeamsLoadingId(null);
    }
  };

  const handleFetchTranscript = async (id: number) => {
    try {
      setTranscriptLoadingId(id);
      await cardTaskService.fetchTranscript(id);
      showSuccess("Transcrição salva e analisada com sucesso!");
      await loadMeetings();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao buscar transcrição");
    } finally {
      setTranscriptLoadingId(null);
    }
  };

  const parseVtt = (vtt: string): { speaker: string; text: string }[] => {
    const lines = vtt.split("\n");
    const result: { speaker: string; text: string }[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "WEBVTT" || trimmed.includes("-->")) continue;
      // Extrai speaker de <v Nome>texto
      const vMatch = trimmed.match(/^<v ([^>]+)>(.*)/);
      if (vMatch) {
        result.push({ speaker: vMatch[1], text: vMatch[2].replace(/<[^>]+>/g, "").trim() });
      } else if (result.length > 0 && !trimmed.match(/^\d+$/) && !trimmed.match(/^\d{2}:\d{2}/)) {
        // Continuação de linha sem speaker tag
        result[result.length - 1].text += " " + trimmed.replace(/<[^>]+>/g, "").trim();
      }
    }
    return result.filter((l) => l.text);
  };

  const renderAnalysis = (analysisJson: string) => {
    try {
      const a: TranscriptAnalysis = JSON.parse(analysisJson);
      const sentimentColor =
        a.sentimento === "positivo"
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
          : a.sentimento === "negativo"
          ? "text-red-400 border-red-500/30 bg-red-500/5"
          : "text-slate-400 border-slate-500/30 bg-slate-500/5";
      const sentimentIcon =
        a.sentimento === "positivo" ? (
          <TrendingUp size={13} />
        ) : a.sentimento === "negativo" ? (
          <TrendingDown size={13} />
        ) : (
          <Minus size={13} />
        );
      const interestColor =
        a.interesse_cliente === "alto"
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
          : a.interesse_cliente === "baixo"
          ? "text-red-400 bg-red-500/10 border-red-500/30"
          : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

      return (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400">
              <BrainCircuit size={13} />
              Análise da Reunião
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${sentimentColor}`}>
                {sentimentIcon}
                {a.sentimento}
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${interestColor}`}>
                Interesse {a.interesse_cliente}
              </span>
            </div>
          </div>
          {a.resumo && (
            <p className="text-xs text-slate-300 leading-relaxed">{a.resumo}</p>
          )}
          {a.objecoes?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-orange-400">Objeções levantadas</p>
              <ul className="space-y-0.5">
                {a.objecoes.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-orange-400">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.proximos_passos?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-emerald-400">Próximos passos</p>
              <ul className="space-y-0.5">
                {a.proximos_passos.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-emerald-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.pontos_de_atencao?.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-yellow-400">
                <AlertTriangle size={11} />
                Pontos de atenção
              </p>
              <ul className="space-y-0.5">
                {a.pontos_de_atencao.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="mt-0.5 text-yellow-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  const renderMeetingCard = (meeting: CardTask, isHistory = false) => {
    const isExpanded = expandedIds.has(meeting.id);
    const isActioning = actionLoadingId === meeting.id;

    return (
      <div
        key={meeting.id}
        className={`rounded-lg border transition-all ${
          isHistory
            ? "border-slate-700/40 bg-slate-800/30"
            : "border-purple-500/20 bg-purple-500/5"
        }`}
      >
        {/* Header */}
        <button
          onClick={() => toggleExpand(meeting.id)}
          className="flex w-full items-start gap-3 p-3 text-left"
        >
          <div className="mt-0.5 flex-shrink-0 text-purple-400">
            <Users size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium leading-snug ${isHistory ? "text-slate-400" : "text-slate-100"}`}>
              {meeting.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {meeting.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatBrazilDate(meeting.due_date)}
                </span>
              )}
              {meeting.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {meeting.duration_minutes} min
                </span>
              )}
              {meeting.contact_name && <span>• {meeting.contact_name}</span>}
              {meeting.teams_join_url && (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400">Teams</span>
              )}
              {meeting.transcript_analysis && (
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-400">Analisada</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-slate-500">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {/* Expandido */}
        {isExpanded && (
          <div className="space-y-3 border-t border-slate-700/40 px-3 pb-3 pt-3">
            {meeting.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{meeting.description}</p>
            )}

            {/* Link de entrada — só para reuniões não concluídas */}
            {meeting.teams_join_url && !meeting.is_completed && (
              <div className="flex gap-2">
                <a
                  href={meeting.teams_join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
                >
                  <MonitorPlay size={14} />
                  Entrar na Reunião Teams
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(meeting.teams_join_url!);
                    showSuccess("Link copiado!");
                  }}
                  title="Copiar link da reunião"
                  className="flex items-center justify-center rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-purple-400 transition-colors hover:bg-purple-500/20"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}

            {/* Aviso de transcrição */}
            {meeting.teams_join_url && !meeting.transcript_analysis && !meeting.is_completed && (
              <div className="flex items-start gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-yellow-400" />
                <p className="text-xs text-yellow-300/80">
                  <span className="font-medium">Lembrete:</span> ao entrar na reunião, clique em{" "}
                  <span className="font-medium">··· → Iniciar transcrição</span> para habilitar a análise por IA após o término.
                </p>
              </div>
            )}

            {/* Botões Teams */}
            <div className="flex flex-wrap gap-2">
              {!meeting.teams_join_url && !meeting.is_completed && !readOnly && (
                <button
                  onClick={() => handleCreateTeamsMeeting(meeting.id)}
                  disabled={teamsLoadingId === meeting.id || !meeting.due_date}
                  title={!meeting.due_date ? "Defina uma data/hora para criar a reunião" : "Criar reunião no Microsoft Teams"}
                  className="flex items-center gap-1.5 rounded border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {teamsLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <MonitorPlay size={13} />
                  )}
                  {teamsLoadingId === meeting.id ? "Criando..." : "Criar link Teams"}
                </button>
              )}

              {meeting.teams_join_url && !meeting.transcript_analysis && (
                <button
                  onClick={() => handleFetchTranscript(meeting.id)}
                  disabled={transcriptLoadingId === meeting.id}
                  title="Buscar transcrição e analisar com IA"
                  className="flex items-center gap-1.5 rounded border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {transcriptLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <BrainCircuit size={13} />
                  )}
                  {transcriptLoadingId === meeting.id ? "Analisando..." : "Analisar Reunião"}
                </button>
              )}

              {meeting.transcript_analysis && (
                <button
                  onClick={() => handleFetchTranscript(meeting.id)}
                  disabled={transcriptLoadingId === meeting.id}
                  title="Re-analisar reunião"
                  className="flex items-center gap-1.5 rounded border border-slate-500/50 bg-slate-500/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-500/20 disabled:opacity-50"
                >
                  {transcriptLoadingId === meeting.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <BrainCircuit size={13} />
                  )}
                  {transcriptLoadingId === meeting.id ? "Analisando..." : "Re-analisar"}
                </button>
              )}
            </div>

            {/* Análise IA */}
            {meeting.transcript_analysis && renderAnalysis(meeting.transcript_analysis)}

            {/* Transcrição completa */}
            {meeting.transcript_raw && (
              <div>
                <button
                  onClick={() => setShowTranscriptIds((prev) => {
                    const next = new Set(prev);
                    next.has(meeting.id) ? next.delete(meeting.id) : next.add(meeting.id);
                    return next;
                  })}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showTranscriptIds.has(meeting.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  Ver transcrição completa
                </button>
                {showTranscriptIds.has(meeting.id) && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded border border-slate-700/50 bg-slate-900/60 p-3 space-y-2">
                    {parseVtt(meeting.transcript_raw).map((line, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="w-24 flex-shrink-0 font-medium text-purple-400/80 truncate">
                          {line.speaker}
                        </span>
                        <span className="text-slate-400 leading-relaxed">{line.text}</span>
                      </div>
                    ))}
                    {parseVtt(meeting.transcript_raw).length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhuma fala identificada na transcrição.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            {!readOnly && (
              <div className="flex items-center gap-2 border-t border-slate-700/30 pt-2">
                {!meeting.is_completed && (
                  <>
                    <button
                      onClick={() => handleComplete(meeting.id)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Concluir
                    </button>
                    <button
                      onClick={() => handleNoShow(meeting.id)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      No-Show
                    </button>
                    <button
                      onClick={() => handleOpenEdit(meeting)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-slate-600/60 bg-slate-700/30 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60 disabled:opacity-50"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleCancelTeams(meeting)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CalendarX size={12} />}
                      Cancelar Reunião
                    </button>
                  </>
                )}
                {isAdmin && !meeting.is_completed && !meeting.is_cancelled && (
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    disabled={isActioning}
                    className="ml-auto flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reuniões</h3>
          {pending.length > 0 && (
            <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              {pending.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
          >
            <Plus size={13} />
            Nova Reunião
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      )}

      {/* Reuniões pendentes */}
      {!loading && pending.length === 0 && completed.length === 0 && cancelled.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700/50 py-8 text-center">
          <Users size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-500">Nenhuma reunião registrada</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((m) => renderMeetingCard(m))}
        </div>
      )}

      {/* Histórico de reuniões concluídas */}
      {!loading && completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {completed.length} reunião{completed.length !== 1 ? "s" : ""} concluída{completed.length !== 1 ? "s" : ""}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {completed.map((m) => renderMeetingCard(m, true))}
            </div>
          )}
        </div>
      )}

      {/* Reuniões canceladas */}
      {!loading && cancelled.length > 0 && (
        <div>
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showCancelled ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <CalendarX size={12} className="text-red-400/60" />
            {cancelled.length} reunião{cancelled.length !== 1 ? "s" : ""} cancelada{cancelled.length !== 1 ? "s" : ""}
          </button>
          {showCancelled && (
            <div className="mt-2 space-y-2">
              {cancelled.map((m) => renderMeetingCard(m, true))}
            </div>
          )}
        </div>
      )}

      {/* Modal editar reunião */}
      <BaseModal
        isOpen={!!editingMeeting}
        onClose={() => setEditingMeeting(null)}
        title="Editar Reunião"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Ex: Apresentação de proposta"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Hora <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Duração (min)</label>
              <select
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Contato</label>
              <input
                type="text"
                value={editForm.contact_name}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                placeholder="Nome do participante"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Descrição / Pauta</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Tópicos da reunião, agenda, observações..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditingMeeting(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
              {savingEdit ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal nova reunião — usa BaseModal (portal) para não ficar preso no stacking context */}
      <BaseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Reunião"
        size="md"
      >
        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Apresentação de proposta"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Hora <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duração e Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Duração (min)
              </label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Contato
              </label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Nome do participante"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Descrição / Pauta
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tópicos da reunião, agenda, observações..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Criando..." : "Criar Reunião"}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default MeetingSection;
