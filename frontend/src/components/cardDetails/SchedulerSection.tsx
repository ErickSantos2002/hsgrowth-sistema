import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  ExternalLink,
  List,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
  Video,
} from "lucide-react";
import {
  TYPE_CONFIG,
  PRIORITY_CONFIG,
  WEEK_DAYS,
} from "../../constants/cardTaskConfig";
import type { TaskType, Priority } from "../../constants/cardTaskConfig";
import cardTaskService, { CardTask } from "../../services/cardTaskService";
import api from "../../services/api";
import {
  convertBrazilToUTC,
  convertUTCToBrazil,
  extractBrazilDateForInput,
  extractBrazilTimeForInput,
  formatBrazilDateTime,
} from "../../utils/timezone";
import type { Card } from "../../types";
import BaseModal from "../common/BaseModal";
import QuickActivityForm from "./QuickActivityForm";
import { showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

// ─── Tipos internos ──────────────────────────────────────────────────────────

// TaskType, Priority e TypeConfig são importados de ../../constants/cardTaskConfig

type ViewMode = "month" | "list" | "outlook";

interface OutlookEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  is_online_meeting: boolean;
  join_url: string;
  organizer: string;
  location: string;
}

interface EditFormData {
  title: string;
  task_type: TaskType;
  priority: Priority;
  date: string;
  time: string;
  duration: string;
  description: string;
  notes: string;
  location: string;
  video_link: string;
}

interface SchedulerSectionProps {
  cardId: number;
  card: Card;
  onUpdate: () => void;
  readOnly?: boolean;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Retorna a data da tarefa convertida para o horário do Brasil (YYYY-MM-DD).
 * Retorna null se a tarefa não tem due_date.
 */
function getTaskBrazilDate(task: CardTask): string | null {
  if (!task.due_date) return null;
  return extractBrazilDateForInput(task.due_date);
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Seção de Calendário — exibe as atividades do card em uma grade visual mensal ou listagem.
 * Permite criar, visualizar, editar e excluir atividades diretamente pela grade
 * mensal ou pela listagem cronológica.
 */
const SchedulerSection: React.FC<SchedulerSectionProps> = ({
  cardId,
  card,
  onUpdate,
  readOnly = false,
}) => {
  const { confirm } = useConfirm();
  // ── Estado do calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Outlook calendar
  const [outlookEvents, setOutlookEvents] = useState<OutlookEvent[]>([]);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [outlookSubView, setOutlookSubView] = useState<"month" | "week">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // começa na segunda
  );

  // ── Schedule do Vendedor (busy slots)
  const [sellerBusy, setSellerBusy] = useState<Array<{
    status: string;
    subject: string;
    start: string;
    end: string;
    is_private: boolean;
  }>>([]);

  // ── Controle dos modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string>("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CardTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    title: "",
    task_type: "call",
    priority: "normal",
    date: "",
    time: "",
    duration: "30",
    description: "",
    notes: "",
    location: "",
    video_link: "",
  });

  // ── Estado de ações em andamento
  const [actionLoading, setActionLoading] = useState(false);

  // ── Refs para os inputs de data/hora no formulário de edição
  const editDateRef = useRef<HTMLInputElement | null>(null);
  const editTimeRef = useRef<HTMLInputElement | null>(null);

  // ── Seletor rápido de mês
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Fecha o seletor ao clicar fora dele
  useEffect(() => {
    if (!showMonthPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(e.target as Node)
      ) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthPicker]);

  // ── Carregamento das tarefas ──────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cardTaskService.getAllByCard(cardId);
      setTasks(result);
    } catch (error) {
      console.error("Erro ao carregar tarefas do calendário:", error);
      showError("Erro ao carregar atividades do calendário");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ── Outlook: busca eventos + schedule do vendedor quando entra na aba ────

  useEffect(() => {
    if (viewMode !== "outlook") return;

    const fetchOutlookData = async () => {
      setOutlookLoading(true);
      setOutlookError(null);
      try {
        const start = outlookSubView === "week"
          ? format(currentWeekStart, "yyyy-MM-dd")
          : format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const end = outlookSubView === "week"
          ? format(addDays(currentWeekStart, 6), "yyyy-MM-dd")
          : format(endOfMonth(currentMonth), "yyyy-MM-dd");

        // Busca eventos próprios do usuário logado
        const eventsResp = await api.get<{ events: OutlookEvent[] }>(
          `/api/v1/auth/me/calendar-events?start=${start}&end=${end}`
        );
        setOutlookEvents(eventsResp.data.events);

        // Busca schedule do Vendedor (se houver vendedor atribuído e email disponível)
        const sellerEmail = card.assigned_to_email;
        if (sellerEmail) {
          try {
            const schedResp = await api.get<{ slots: typeof sellerBusy }>(
              `/api/v1/auth/me/seller-schedule?email=${encodeURIComponent(sellerEmail)}&start=${start}&end=${end}`
            );
            setSellerBusy(schedResp.data.slots);
          } catch {
            setSellerBusy([]);
          }
        } else {
          setSellerBusy([]);
        }
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Erro ao carregar calendário do Outlook.";
        setOutlookError(msg);
      } finally {
        setOutlookLoading(false);
      }
    };

    fetchOutlookData();
  }, [viewMode, currentMonth, currentWeekStart, outlookSubView, card.assigned_to_email]);

  // ── Navegação do mês ──────────────────────────────────────────────────────

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handlePrevWeek = () => setCurrentWeekStart((d) => addDays(d, -7));
  const handleNextWeek = () => setCurrentWeekStart((d) => addDays(d, 7));
  const handleThisWeek = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  /** Abre o seletor de mês sincronizando o ano exibido com o mês atual */
  const handleOpenMonthPicker = () => {
    setPickerYear(currentMonth.getFullYear());
    setShowMonthPicker((v) => !v);
  };

  /** Seleciona um mês no picker e fecha o popover */
  const handleSelectMonth = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  };

  // ── Handlers dos modais ───────────────────────────────────────────────────

  /** Abre o formulário de criação com a data do dia clicado pré-preenchida */
  const handleDayClick = (dateStr: string) => {
    // Visualizadores não podem criar atividades
    if (readOnly) return;
    setPreselectedDate(dateStr);
    setShowCreateModal(true);
  };

  /** Abre o modal de detalhes de uma tarefa */
  const handleTaskPillClick = (e: React.MouseEvent, task: CardTask) => {
    // Evita propagar o clique para o container do dia (que abriria o form de criação)
    e.stopPropagation();
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleCreateSave = async () => {
    setShowCreateModal(false);
    await loadTasks();
    onUpdate();
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // ── Ações sobre a tarefa selecionada ─────────────────────────────────────

  /** Alterna o status de concluída/aberta da tarefa */
  const handleToggleComplete = async () => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      const updated = await cardTaskService.toggleComplete(
        selectedTask.id,
        !selectedTask.is_completed
      );
      // Atualiza localmente para evitar reload completo
      setSelectedTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar status da tarefa:", error);
      showError("Erro ao atualizar atividade");
    } finally {
      setActionLoading(false);
    }
  };

  /** Abre o modal de edição com os dados da tarefa pré-preenchidos */
  const handleEditClick = () => {
    if (!selectedTask) return;
    setEditFormData({
      title: selectedTask.title,
      task_type: selectedTask.task_type,
      priority: selectedTask.priority,
      date: selectedTask.due_date
        ? extractBrazilDateForInput(selectedTask.due_date)
        : "",
      time: selectedTask.due_date
        ? extractBrazilTimeForInput(selectedTask.due_date)
        : "",
      duration: String(selectedTask.duration_minutes ?? 30),
      description: selectedTask.description ?? "",
      notes: selectedTask.notes ?? "",
      location: selectedTask.location ?? "",
      video_link: selectedTask.video_link ?? "",
    });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  /** Salva as alterações do formulário de edição */
  const handleEditSave = async () => {
    if (!selectedTask) return;

    if (!editFormData.title.trim()) {
      showError("Por favor, preencha o título da atividade");
      return;
    }

    setActionLoading(true);
    try {
      // Converte data/hora do Brasil para UTC antes de enviar ao backend
      const dueDateUTC = editFormData.date
        ? convertBrazilToUTC(editFormData.date, editFormData.time || "12:00")
        : undefined;

      await cardTaskService.update(selectedTask.id, {
        title: editFormData.title,
        task_type: editFormData.task_type,
        priority: editFormData.priority,
        due_date: dueDateUTC,
        duration_minutes: parseInt(editFormData.duration) || 30,
        description: editFormData.description || undefined,
        notes: editFormData.notes || undefined,
        location: editFormData.location || undefined,
        video_link: editFormData.video_link || undefined,
      });

      setShowEditModal(false);
      setSelectedTask(null);
      await loadTasks();
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar edição da tarefa:", error);
      showError("Erro ao salvar alterações");
    } finally {
      setActionLoading(false);
    }
  };

  /** Exclui a tarefa após confirmação do usuário */
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    const confirmed = await confirm({
      title: "Excluir atividade",
      message: `Excluir a atividade "${selectedTask.title}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await cardTaskService.delete(selectedTask.id);
      setShowDetailModal(false);
      setSelectedTask(null);
      await loadTasks();
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      showError("Erro ao excluir atividade");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Renderização da grade do calendário ──────────────────────────────────

  /** Renderiza um pill (etiqueta) de tarefa dentro de uma célula do calendário */
  const renderTaskPill = (
    task: CardTask,
    onClick: (e: React.MouseEvent) => void
  ) => {
    const config = TYPE_CONFIG[task.task_type] ?? TYPE_CONFIG.other;
    return (
      <button
        onClick={onClick}
        className={[
          "flex w-full items-center gap-1 truncate rounded border px-1 py-0.5 text-left text-xs",
          "transition-all hover:brightness-125",
          config.pillBg,
          config.pillText,
          config.pillBorder,
          task.is_completed ? "opacity-50 line-through" : "",
        ].join(" ")}
        title={task.title}
        type="button"
      >
        <config.Icon size={10} className="flex-shrink-0" />
        <span className="truncate">{task.title}</span>
      </button>
    );
  };

  // ── Renderização do Outlook ───────────────────────────────────────────────

  const renderOutlookWeekView = () => {
    const HOUR_HEIGHT = 60; // px por hora
    const START_HOUR = 8;
    const END_HOUR = 17;
    const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    // Agrupa eventos por dia (YYYY-MM-DD no fuso de São Paulo)
    const eventsByDay: Record<string, OutlookEvent[]> = {};
    for (const ev of outlookEvents) {
      // O campo start pode ser "2026-04-14T10:00:00" (sem Z) — Graph retorna sem Z mas em UTC
      const startUtc = new Date(ev.start.endsWith("Z") ? ev.start : ev.start + "Z");
      const dayBR = startUtc.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
      if (!eventsByDay[dayBR]) eventsByDay[dayBR] = [];
      eventsByDay[dayBR].push(ev);
    }

    // Agrupa busy slots do Vendedor por dia
    const sellerByDay: Record<string, typeof sellerBusy> = {};
    for (const slot of sellerBusy) {
      if (slot.status === "free" || slot.status === "workingElsewhere") continue;
      const startUtc = new Date(slot.start.endsWith("Z") ? slot.start : slot.start + "Z");
      const dayBR = startUtc.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      if (!sellerByDay[dayBR]) sellerByDay[dayBR] = [];
      sellerByDay[dayBR].push(slot);
    }

    const getSlotStyle = (start: string, end: string) => {
      const startUtc = new Date(start.endsWith("Z") ? start : start + "Z");
      const endUtc = new Date(end.endsWith("Z") ? end : end + "Z");
      const localStart = new Date(startUtc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const localEnd = new Date(endUtc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
      const endMinutes = localEnd.getHours() * 60 + localEnd.getMinutes();
      const topMinutes = Math.max(startMinutes - START_HOUR * 60, 0);
      const durationMinutes = Math.max(endMinutes - startMinutes, 15);
      return {
        top: (topMinutes / 60) * HOUR_HEIGHT,
        height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 8),
      };
    };

    const getEventStyle = (ev: OutlookEvent) => {
      const startUtc = new Date(ev.start.endsWith("Z") ? ev.start : ev.start + "Z");
      const endUtc = new Date(ev.end.endsWith("Z") ? ev.end : ev.end + "Z");

      // Hora local de São Paulo
      const localStart = new Date(startUtc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const localEnd = new Date(endUtc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

      const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
      const endMinutes = localEnd.getHours() * 60 + localEnd.getMinutes();

      const topMinutes = Math.max(startMinutes - START_HOUR * 60, 0);
      const durationMinutes = Math.max(endMinutes - startMinutes, 30);

      const top = (topMinutes / 60) * HOUR_HEIGHT;
      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 22);
      const timeLabel = `${String(localStart.getHours()).padStart(2, "0")}:${String(localStart.getMinutes()).padStart(2, "0")}`;

      return { top, height, timeLabel };
    };

    return (
      <div className="overflow-auto rounded-lg border border-gray-200 dark:border-slate-700" style={{ maxHeight: "520px" }}>
        {/* Cabeçalho fixo com dias da semana */}
        <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="w-12 flex-shrink-0" />
          {weekDays.map((day) => {
            const isTodayDay = isToday(day);
            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className="flex flex-1 flex-col items-center border-l border-gray-200 py-2 dark:border-slate-700"
              >
                <span className="text-xs capitalize text-slate-500">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span
                  className={[
                    "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                    isTodayDay
                      ? "bg-emerald-500 text-white"
                      : "text-slate-900 dark:text-white",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Corpo: coluna de horários + colunas de dias */}
        <div className="flex">
          {/* Coluna de horários */}
          <div className="w-12 flex-shrink-0">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end border-t border-gray-100 pr-2 pt-1 dark:border-slate-800"
              >
                {h < END_HOUR && (
                  <span className="text-xs text-slate-400">
                    {String(h).padStart(2, "0")}h
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const events = eventsByDay[dayStr] || [];
            const isTodayDay = isToday(day);

            return (
              <div
                key={dayStr}
                className={[
                  "relative flex-1 border-l border-gray-200 dark:border-slate-700",
                  isTodayDay ? "bg-emerald-500/5" : "",
                ].join(" ")}
                style={{ height: HOUR_HEIGHT * HOURS.length }}
              >
                {/* Linhas das horas */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-slate-800"
                  />
                ))}

                {/* Linha de meia-hora (tracejada) */}
                {HOURS.slice(0, -1).map((h) => (
                  <div
                    key={`${h}-half`}
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    className="absolute left-0 right-0 border-t border-dashed border-gray-100/60 dark:border-slate-800/60"
                  />
                ))}

                {/* Blocos ocupados do Vendedor (fundo cinza rajado) */}
                {(sellerByDay[dayStr] || []).map((slot, idx) => {
                  const { top, height } = getSlotStyle(slot.start, slot.end);
                  return (
                    <div
                      key={`seller-${idx}`}
                      style={{ top, height, left: 0, right: 0, position: "absolute" }}
                      title={`Vendedor ocupado${slot.is_private ? "" : slot.subject ? `: ${slot.subject}` : ""}`}
                      className="pointer-events-none"
                    >
                      {/* Fundo rajado cinza */}
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: "repeating-linear-gradient(45deg, #94a3b8 0px, #94a3b8 2px, transparent 2px, transparent 8px)",
                        }}
                      />
                    </div>
                  );
                })}

                {/* Eventos posicionados absolutamente */}
                {events.map((ev) => {
                  const { top, height, timeLabel } = getEventStyle(ev);
                  return (
                    <div
                      key={ev.id}
                      style={{ top, height, left: 2, right: 2, position: "absolute" }}
                      className={[
                        "overflow-hidden rounded px-1.5 py-0.5 text-xs",
                        ev.is_online_meeting
                          ? "border border-purple-500/40 bg-purple-500/20 text-purple-300"
                          : "border border-indigo-500/30 bg-indigo-500/15 text-indigo-300",
                      ].join(" ")}
                      title={`${ev.subject}\n${timeLabel}${ev.organizer ? `\n${ev.organizer}` : ""}${ev.location ? `\n${ev.location}` : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        {ev.is_online_meeting
                          ? <Users size={9} className="flex-shrink-0" />
                          : <Mail size={9} className="flex-shrink-0" />
                        }
                        <span className="truncate font-medium leading-tight">
                          {ev.subject || "(Sem título)"}
                        </span>
                      </div>
                      {height > 32 && (
                        <div className="mt-0.5 text-xs opacity-70">{timeLabel}</div>
                      )}
                      {ev.join_url && height > 46 && (
                        <a
                          href={ev.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 flex items-center gap-0.5 text-xs opacity-80 hover:opacity-100"
                        >
                          <ExternalLink size={9} />
                          Entrar
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOutlookView = () => {
    return (
      <div className="space-y-3">
        {/* Sub-toggle Semana / Mês */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setOutlookSubView("week")}
              className={[
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                outlookSubView === "week"
                  ? "border border-purple-500/40 bg-purple-500/20 text-purple-400"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setOutlookSubView("month")}
              className={[
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                outlookSubView === "month"
                  ? "border border-purple-500/40 bg-purple-500/20 text-purple-400"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              Mês
            </button>
          </div>
          <span className="text-xs text-slate-500">Calendário Outlook</span>
          {card.assigned_to_name && card.assigned_to_email && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className="inline-block h-3 w-3 rounded-sm opacity-40"
                style={{
                  background: "repeating-linear-gradient(45deg, #94a3b8 0px, #94a3b8 2px, transparent 2px, transparent 8px)",
                }}
              />
              Ocupado: {card.assigned_to_name}
            </span>
          )}
        </div>

        {/* Conteúdo */}
        {outlookLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : outlookError ? (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
            <Mail size={20} className="mx-auto mb-2 text-orange-400" />
            <p className="text-sm text-orange-300">{outlookError}</p>
            <p className="mt-1 text-xs text-slate-500">
              Faça logout e entre novamente pelo botão "Entrar com Microsoft" para liberar o acesso ao calendário.
            </p>
          </div>
        ) : outlookSubView === "week" ? (
          renderOutlookWeekView()
        ) : (
          renderMonthView(outlookEvents)
        )}
      </div>
    );
  };

  const renderMonthView = (extraEvents?: OutlookEvent[]) => {
    const outlookOnly = extraEvents !== undefined;

    // Calcula os dias a exibir (inclui dias de meses adjacentes para preencher a grade)
    const monthStart = startOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    // Agrupa eventos do Outlook por dia (YYYY-MM-DD em UTC)
    const outlookByDay: Record<string, OutlookEvent[]> = {};
    if (extraEvents) {
      for (const ev of extraEvents) {
        const day = ev.start.substring(0, 10);
        if (!outlookByDay[day]) outlookByDay[day] = [];
        outlookByDay[day].push(ev);
      }
    }

    const formatTime = (iso: string) => {
      const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    };

    return (
      <div className="select-none">
        {/* Cabeçalho: abreviações dos dias da semana */}
        <div className="mb-1 grid grid-cols-7">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade dos dias */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-slate-700 dark:bg-slate-700">
          {calendarDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayTasks = outlookOnly ? [] : tasks.filter(
              (t) => getTaskBrazilDate(t) === dayStr
            );
            const dayOutlook = outlookByDay[dayStr] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);
            const totalItems = dayTasks.length + dayOutlook.length;
            const visibleTasks = dayTasks.slice(0, 3);
            const remainingSlots = Math.max(0, 3 - visibleTasks.length);
            const visibleOutlook = dayOutlook.slice(0, remainingSlots);
            const overflow = totalItems - visibleTasks.length - visibleOutlook.length;

            return (
              <div
                key={dayStr}
                onClick={() => handleDayClick(dayStr)}
                className={[
                  "min-h-[88px] cursor-pointer p-1.5 transition-colors",
                  isCurrentMonth
                    ? "bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                    : "bg-gray-50/80 hover:bg-gray-100/60 dark:bg-slate-900/50 dark:hover:bg-slate-800/40",
                ].join(" ")}
              >
                {/* Número do dia */}
                <div className="mb-1 flex items-center justify-end">
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                      isTodayDay
                        ? "bg-emerald-500 font-bold text-white"
                        : isCurrentMonth
                          ? "text-slate-900 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-600",
                    ].join(" ")}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Pills das tarefas do dia */}
                <div className="space-y-0.5">
                  {visibleTasks.map((task) => (
                    <div key={task.id}>
                      {renderTaskPill(task, (e) =>
                        handleTaskPillClick(e, task)
                      )}
                    </div>
                  ))}

                  {/* Pills dos eventos Outlook */}
                  {visibleOutlook.map((ev) => (
                    <div
                      key={ev.id}
                      title={`${ev.subject}\n${formatTime(ev.start)} – ${formatTime(ev.end)}${ev.organizer ? `\n${ev.organizer}` : ""}${ev.location ? `\n${ev.location}` : ""}`}
                      className={`group flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs leading-tight ${
                        ev.is_online_meeting
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-indigo-500/15 text-indigo-300"
                      }`}
                    >
                      {ev.is_online_meeting
                        ? <Users size={9} className="flex-shrink-0" />
                        : <Mail size={9} className="flex-shrink-0" />
                      }
                      <span className="truncate">{ev.subject || "(Sem título)"}</span>
                      {ev.join_url && (
                        <a
                          href={ev.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  ))}

                  {/* Indicador de overflow quando há mais de 3 tarefas */}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dayTasks[3]) handleTaskPillClick(e, dayTasks[3]);
                      }}
                      className="w-full rounded px-1 py-0.5 text-center text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      +{overflow} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda — só aparece na view Outlook */}
        {extraEvents && (
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-purple-500/40" />
              Reunião Teams
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-indigo-500/30" />
              Evento Outlook
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Renderização da lista ─────────────────────────────────────────────────

  const renderListView = () => {
    // Separa tarefas com e sem data
    const withDate = tasks
      .filter((t) => t.due_date)
      .sort((a, b) => {
        const da = extractBrazilDateForInput(a.due_date!);
        const db = extractBrazilDateForInput(b.due_date!);
        return da.localeCompare(db);
      });
    const withoutDate = tasks.filter((t) => !t.due_date);

    if (tasks.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center">
          <Calendar size={28} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-400">Nenhuma atividade agendada</p>
        </div>
      );
    }

    // Agrupa tarefas com data por mês para exibição em seções
    const grouped: Record<string, CardTask[]> = {};
    for (const task of withDate) {
      const brazilDate = convertUTCToBrazil(task.due_date!);
      const monthKey = format(brazilDate, "MMMM yyyy", { locale: ptBR });
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(task);
    }

    const renderTaskRow = (task: CardTask) => {
      const config = TYPE_CONFIG[task.task_type] ?? TYPE_CONFIG.other;
      const priorityConfig =
        PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;

      return (
        <button
          key={task.id}
          type="button"
          onClick={() => {
            setSelectedTask(task);
            setShowDetailModal(true);
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
        >
          {/* Ícone representando o tipo da tarefa */}
          <div
            className={[
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
              config.pillBg,
              config.pillText,
              config.pillBorder,
            ].join(" ")}
          >
            <config.Icon size={16} />
          </div>

          {/* Título e data */}
          <div className="min-w-0 flex-1">
            <p
              className={[
                "truncate text-sm font-medium text-slate-900 dark:text-white",
                task.is_completed ? "opacity-60 line-through" : "",
              ].join(" ")}
            >
              {task.title}
            </p>
            {task.due_date && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatBrazilDateTime(task.due_date)}
              </p>
            )}
          </div>

          {/* Badge de prioridade */}
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityConfig.badgeClass}`}
          >
            {priorityConfig.label}
          </span>

          {/* Ícone de concluída */}
          {task.is_completed && (
            <CheckCircle2 size={16} className="flex-shrink-0 text-green-400" />
          )}
        </button>
      );
    };

    return (
      <div className="space-y-6">
        {/* Tarefas agrupadas por mês */}
        {Object.entries(grouped).map(([month, monthTasks]) => (
          <div key={month}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 capitalize">
              {month}
            </h4>
            <div className="space-y-2">{monthTasks.map(renderTaskRow)}</div>
          </div>
        ))}

        {/* Tarefas sem data agendada */}
        {withoutDate.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Sem data
            </h4>
            <div className="space-y-2">{withoutDate.map(renderTaskRow)}</div>
          </div>
        )}
      </div>
    );
  };

  // ── Modal de detalhes da tarefa ───────────────────────────────────────────

  const renderDetailModal = () => {
    if (!selectedTask) return null;

    const config = TYPE_CONFIG[selectedTask.task_type] ?? TYPE_CONFIG.other;
    const priorityConfig =
      PRIORITY_CONFIG[selectedTask.priority] ?? PRIORITY_CONFIG.normal;

    return (
      <BaseModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        title={selectedTask.title}
        subtitle={config.label}
        size="md"
        footer={
          <div className="flex gap-2">
            {/* Botão de concluir — oculto para visualizadores e quando já está concluída */}
            {!readOnly && !selectedTask.is_completed && (
              <button
                type="button"
                onClick={handleToggleComplete}
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Concluir
              </button>
            )}

            {/* Botões de editar e excluir - ocultos para visualizadores */}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Edit2 size={16} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Badges de tipo, prioridade e status */}
          <div className="flex flex-wrap gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                config.pillBg,
                config.pillText,
                config.pillBorder,
              ].join(" ")}
            >
              <config.Icon size={12} />
              {config.label}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${priorityConfig.badgeClass}`}
            >
              {priorityConfig.label}
            </span>
            {selectedTask.is_completed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
                <CheckCircle2 size={12} />
                Concluída
              </span>
            )}
          </div>

          {/* Data, hora e duração */}
          {selectedTask.due_date && (
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Calendar size={16} className="flex-shrink-0 text-slate-400" />
              <span>{formatBrazilDateTime(selectedTask.due_date)}</span>
              {selectedTask.duration_minutes && (
                <span className="text-slate-400 dark:text-slate-500">
                  • {selectedTask.duration_minutes} min
                </span>
              )}
            </div>
          )}

          {/* Localização */}
          {selectedTask.location && (
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <MapPin size={16} className="flex-shrink-0 text-slate-400" />
              <span>{selectedTask.location}</span>
            </div>
          )}

          {/* Link de videochamada */}
          {selectedTask.video_link && (
            <div className="flex items-center gap-2 text-sm">
              <Video size={16} className="flex-shrink-0 text-slate-400" />
              <a
                href={selectedTask.video_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
              >
                Link da videochamada
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Responsável */}
          {selectedTask.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <User size={16} className="flex-shrink-0 text-slate-400" />
              <span>{selectedTask.assigned_to_name}</span>
            </div>
          )}

          {/* Descrição */}
          {selectedTask.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Descrição
              </p>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-200">
                {selectedTask.description}
              </p>
            </div>
          )}

          {/* Notas adicionais */}
          {selectedTask.notes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Notas
              </p>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-200">
                {selectedTask.notes}
              </p>
            </div>
          )}
        </div>
      </BaseModal>
    );
  };

  // ── Modal de edição da tarefa ─────────────────────────────────────────────

  /** Conteúdo interno do formulário de edição (segue o mesmo visual do QuickActivityForm) */
  const renderEditForm = () => {
    const taskTypes: Array<{
      type: TaskType;
      label: string;
      Icon: React.ElementType;
    }> = [
      { type: "call", label: "Ligação", Icon: Phone },
      { type: "task", label: "Tarefa", Icon: CheckSquare },
      { type: "follow_up", label: "Follow Up", Icon: Clock },
      { type: "other", label: "Outro", Icon: MoreHorizontal },
    ];

    /** Retorna as classes do botão de tipo conforme seleção */
    const getTypeClass = (type: TaskType, selected: boolean) => {
      if (!selected)
        return "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700";
      const c = TYPE_CONFIG[type];
      return `${c.pillBg} ${c.pillText} ${c.pillBorder}`;
    };

    /** Retorna as classes do botão de prioridade conforme seleção */
    const getPriorityClass = (priority: Priority, selected: boolean) => {
      if (!selected)
        return "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700";
      return PRIORITY_CONFIG[priority].badgeClass;
    };

    return (
      <div className="space-y-4">
        {/* Título */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Título da atividade
          </label>
          <input
            type="text"
            value={editFormData.title}
            onChange={(e) =>
              setEditFormData({ ...editFormData, title: e.target.value })
            }
            className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
            autoFocus
          />
        </div>

        {/* Tipo de atividade */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-400">
            Tipo de atividade
          </label>
          <div className="grid grid-cols-4 gap-2">
            {taskTypes.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setEditFormData({ ...editFormData, task_type: type })
                }
                className={[
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  getTypeClass(type, editFormData.task_type === type),
                ].join(" ")}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data, Hora e Duração */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Data
            </label>
            <div className="relative">
              <input
                ref={editDateRef}
                type="date"
                value={editFormData.date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, date: e.target.value })
                }
                className="activity-picker-input w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 pr-10 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  editDateRef.current?.showPicker?.();
                  editDateRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                aria-label="Selecionar data"
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Hora
            </label>
            <div className="relative">
              <input
                ref={editTimeRef}
                type="time"
                value={editFormData.time}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, time: e.target.value })
                }
                className="activity-picker-input w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 pr-10 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  editTimeRef.current?.showPicker?.();
                  editTimeRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                aria-label="Selecionar hora"
              >
                <Clock size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Duração (min)
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={editFormData.duration}
              onChange={(e) =>
                setEditFormData({ ...editFormData, duration: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
            />
          </div>
        </div>

        {/* Prioridade */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-400">
            Prioridade
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["normal", "high", "urgent"] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setEditFormData({ ...editFormData, priority: p })
                }
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  getPriorityClass(p, editFormData.priority === p),
                ].join(" ")}
              >
                {PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Descrição
          </label>
          <textarea
            value={editFormData.description}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                description: e.target.value,
              })
            }
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
          />
        </div>

        {/* Notas adicionais */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Notas adicionais
          </label>
          <textarea
            value={editFormData.notes}
            onChange={(e) =>
              setEditFormData({ ...editFormData, notes: e.target.value })
            }
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
          />
        </div>

        {/* Localização e link de vídeo */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="flex-shrink-0 text-slate-400" />
            <input
              type="text"
              value={editFormData.location}
              onChange={(e) =>
                setEditFormData({ ...editFormData, location: e.target.value })
              }
              placeholder="Adicionar localização..."
              className="flex-1 rounded-lg border border-gray-200 bg-white/50 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Video size={16} className="flex-shrink-0 text-slate-400" />
            <input
              type="url"
              value={editFormData.video_link}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  video_link: e.target.value,
                })
              }
              placeholder="Link da videochamada..."
              className="flex-1 rounded-lg border border-gray-200 bg-white/50 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => (
    <BaseModal
      isOpen={showEditModal}
      onClose={() => {
        setShowEditModal(false);
        setSelectedTask(null);
      }}
      title="Editar Atividade"
      size="lg"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowEditModal(false);
              setSelectedTask(null);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEditSave}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {actionLoading && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Salvar alterações
          </button>
        </div>
      }
    >
      {renderEditForm()}
    </BaseModal>
  );

  // ── Renderização principal ────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header responsivo: linha 1 → nav do mês | linha 2 → Mês/Lista/Agendar (no mobile) */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
        {/* Navegação entre meses — oculta na view lista */}
        {viewMode === "month" || viewMode === "outlook" ? (
          <div className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={viewMode === "outlook" && outlookSubView === "week" ? handlePrevWeek : handlePrevMonth}
              aria-label={viewMode === "outlook" && outlookSubView === "week" ? "Semana anterior" : "Mês anterior"}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Título: semana ou mês */}
            {viewMode === "outlook" && outlookSubView === "week" ? (
              <span className="px-2 py-1 text-sm font-semibold text-slate-900 dark:text-white">
                {format(currentWeekStart, "d", { locale: ptBR })}
                {" – "}
                {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: ptBR })}
              </span>
            ) : (
              /* Título clicável que abre o seletor rápido de mês */
              <div className="relative" ref={monthPickerRef}>
                <button
                  type="button"
                  onClick={handleOpenMonthPicker}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold capitalize text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800"
                >
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-150 ${showMonthPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Popover de seleção rápida */}
                {showMonthPicker && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {/* Navegação de ano */}
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y - 1)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Ano anterior"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {pickerYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y + 1)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Próximo ano"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {/* Grid 4 colunas × 3 linhas com abreviações dos meses */}
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const isSelected =
                          currentMonth.getMonth() === i &&
                          currentMonth.getFullYear() === pickerYear;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectMonth(i)}
                            className={[
                              "rounded-lg py-1.5 text-xs font-medium capitalize transition-colors",
                              isSelected
                                ? "bg-blue-500 text-white"
                                : "text-slate-600 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                            ].join(" ")}
                          >
                            {format(new Date(pickerYear, i, 1), "MMM", {
                              locale: ptBR,
                            })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={viewMode === "outlook" && outlookSubView === "week" ? handleNextWeek : handleNextMonth}
              aria-label={viewMode === "outlook" && outlookSubView === "week" ? "Próxima semana" : "Próximo mês"}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={viewMode === "outlook" && outlookSubView === "week" ? handleThisWeek : handleToday}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Hoje
            </button>
          </div>
        ) : (
          <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
            Todas as atividades
          </p>
        )}

        {/* Controles: toggle Mês/Lista + botão Agendar — ocupa linha inteira no mobile */}
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {/* Pill toggle de view */}
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              <Calendar size={13} />
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              <List size={13} />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("outlook")}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "outlook"
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              <Mail size={13} />
              Outlook
            </button>
          </div>

          {/* Botão de agendar - oculto para visualizadores */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setPreselectedDate("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <Plus size={14} />
              Agendar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: loading, grade do mês ou listagem */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : viewMode === "outlook" ? (
        renderOutlookView()
      ) : viewMode === "month" ? (
        renderMonthView()
      ) : (
        renderListView()
      )}

      {/* Modal de criação de atividade
          Passa defaultDate para que o QuickActivityForm inicie expandido e com a data preenchida */}
      <BaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agendar Atividade"
        size="lg"
      >
        <QuickActivityForm
          cardId={cardId}
          onSave={handleCreateSave}
          onCancel={() => setShowCreateModal(false)}
          defaultDate={preselectedDate}
        />
      </BaseModal>

      {/* Modal de detalhes da tarefa selecionada */}
      {renderDetailModal()}

      {/* Modal de edição da tarefa */}
      {renderEditModal()}
    </div>
  );
};

export default SchedulerSection;
