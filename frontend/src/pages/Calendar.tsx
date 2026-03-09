import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Building2,
  Calendar as CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  List,
  Loader2,
  MapPin,
  User,
  Video,
} from "lucide-react";
import cardTaskService, { CardTask } from "../services/cardTaskService";
import userService from "../services/userService";
import { useAuth } from "../hooks/useAuth";
import { User as UserType } from "../types";
import {
  TYPE_CONFIG,
  PRIORITY_CONFIG,
  WEEK_DAYS,
} from "../constants/cardTaskConfig";
import type { TaskType, Priority } from "../constants/cardTaskConfig";
import {
  convertUTCToBrazil,
  extractBrazilDateForInput,
  formatBrazilDateTime,
} from "../utils/timezone";
import BaseModal from "../components/common/BaseModal";
import { showError } from "../utils/toast";

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ViewMode = "month" | "list";

// ─── Utilitários ──────────────────────────────────────────────────────────────

/**
 * Retorna a data da tarefa convertida para o fuso do Brasil (YYYY-MM-DD).
 * Retorna null se a tarefa não tem due_date.
 */
function getTaskBrazilDate(task: CardTask): string | null {
  if (!task.due_date) return null;
  return extractBrazilDateForInput(task.due_date);
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Página de Calendário Global — exibe atividades de todos os cards.
 *
 * Controle de visibilidade por role:
 * - admin / manager: veem todos por padrão, com seletor para filtrar por usuário
 * - salesperson / sdr: filtro fixo no próprio user.id, sem opção de trocar
 *
 * Somente leitura: sem criar, editar ou excluir atividades.
 */
const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determina se o usuário pode ver atividades de todos (ou escolher)
  const isAdminOrManager =
    user?.role === "admin" || user?.role === "manager";

  // ── Estado do calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Seletor de usuário (somente admin/manager)
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // ── Seletor rápido de mês
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // ── Modal de detalhes da tarefa
  const [selectedTask, setSelectedTask] = useState<CardTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Modal de "ver todas" as atividades de um dia específico
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalTasks, setDayModalTasks] = useState<CardTask[]>([]);
  const [dayModalDate, setDayModalDate] = useState<string>("");

  // ── Carrega lista de usuários ativos (somente admin/manager)
  useEffect(() => {
    if (!isAdminOrManager) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const users = await userService.listActive();
        setActiveUsers(users);
      } catch {
        showError("Erro ao carregar lista de usuários");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isAdminOrManager]);

  // ── Fecha dropdown de usuário ao clicar fora
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserDropdown]);

  // ── Fecha seletor de mês ao clicar fora
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

  // ── Carregamento das tarefas
  const loadTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Admin/manager: passa filterUserId (null = todos); outros roles: sempre o próprio ID
      const assignedToId = isAdminOrManager
        ? (filterUserId ?? undefined)
        : user.id;

      const result = await cardTaskService.getForCalendar(assignedToId);
      setTasks(result);
    } catch {
      showError("Erro ao carregar atividades do calendário");
    } finally {
      setLoading(false);
    }
  }, [user, isAdminOrManager, filterUserId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ── Navegação do mês
  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const handleToday = () => setCurrentMonth(new Date());

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

  // ── Seleção de filtro de usuário (somente admin/manager)
  const handleSelectUser = (userId: number | null) => {
    setFilterUserId(userId);
    setShowUserDropdown(false);
  };

  // ── Abre modal de detalhes (somente leitura)
  const handleTaskPillClick = (e: React.MouseEvent, task: CardTask) => {
    // Evita propagar o clique para o container do dia
    e.stopPropagation();
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  /** Abre o modal com todas as tarefas de um dia (botão "+X mais") */
  const handleShowMoreClick = (
    e: React.MouseEvent,
    dayStr: string,
    allDayTasks: CardTask[]
  ) => {
    e.stopPropagation();
    setDayModalDate(dayStr);
    setDayModalTasks(allDayTasks);
    setShowDayModal(true);
  };

  /** Clica em uma tarefa dentro do modal de dia: fecha o modal de dia e abre o detalhe */
  const handleTaskFromDayModal = (task: CardTask) => {
    setShowDayModal(false);
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // ── Navega para o card da tarefa
  const handleOpenCard = () => {
    if (!selectedTask) return;
    navigate(`/cards/${selectedTask.card_id}`);
  };

  // ── Renderização do pill de tarefa (célula do calendário)
  const renderTaskPill = (
    task: CardTask,
    onClick: (e: React.MouseEvent) => void
  ) => {
    const config = TYPE_CONFIG[task.task_type as TaskType] ?? TYPE_CONFIG.other;
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

  // ── View mensal
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    return (
      <div className="select-none">
        {/* Cabeçalho: abreviações dos dias da semana */}
        <div className="mb-1 grid grid-cols-7">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade dos dias */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-slate-700 dark:bg-slate-700">
          {calendarDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayTasks = tasks.filter(
              (t) => getTaskBrazilDate(t) === dayStr
            );
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);
            const visibleTasks = dayTasks.slice(0, 3);
            const overflow = dayTasks.length - 3;

            return (
              <div
                key={dayStr}
                className={[
                  "min-h-[88px] p-1.5 transition-colors",
                  isCurrentMonth
                    ? "bg-white dark:bg-slate-900"
                    : "bg-gray-50/80 dark:bg-slate-900/50",
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

                {/* Pills das tarefas */}
                <div className="space-y-0.5">
                  {visibleTasks.map((task) => (
                    <div key={task.id}>
                      {renderTaskPill(task, (e) =>
                        handleTaskPillClick(e, task)
                      )}
                    </div>
                  ))}

                  {/* Botão de overflow: abre modal com todas as tarefas do dia */}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleShowMoreClick(e, dayStr, dayTasks)}
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
      </div>
    );
  };

  // ── View lista
  const renderListView = () => {
    const withDate = tasks
      .filter((t) => t.due_date)
      .sort((a, b) => {
        const da = extractBrazilDateForInput(a.due_date!);
        const db = extractBrazilDateForInput(b.due_date!);
        return da.localeCompare(db);
      });
    const withoutDate = tasks.filter((t) => !t.due_date);

    // Tarefas do mês atual (filtradas por currentMonth)
    const monthTasks = withDate.filter((t) => {
      const brazilDate = convertUTCToBrazil(t.due_date!);
      return isSameMonth(brazilDate, currentMonth);
    });

    // Rótulo do mês atual formatado com inicial maiúscula
    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });
    const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const renderTaskRow = (task: CardTask) => {
      const config = TYPE_CONFIG[task.task_type as TaskType] ?? TYPE_CONFIG.other;
      const priorityConfig =
        PRIORITY_CONFIG[task.priority as Priority] ?? PRIORITY_CONFIG.normal;

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
          {/* Ícone do tipo */}
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

          {/* Título, card e data */}
          <div className="min-w-0 flex-1">
            <p
              className={[
                "truncate text-sm font-medium text-slate-900 dark:text-white",
                task.is_completed ? "opacity-60 line-through" : "",
              ].join(" ")}
            >
              {task.title}
            </p>
            {/* Info do card (contexto extra na visão global) */}
            {(task.card_title || task.card_client_name) && (
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {task.card_title}
                {task.card_title && task.card_client_name && " · "}
                {task.card_client_name}
              </p>
            )}
            {task.due_date && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatBrazilDateTime(task.due_date)}
              </p>
            )}
          </div>

          {/* Responsável */}
          {task.assigned_to_name && (
            <span className="flex-shrink-0 max-w-[100px] truncate text-xs text-slate-400 dark:text-slate-500">
              {task.assigned_to_name}
            </span>
          )}

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
        {/* Navegação de mês */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <button
            type="button"
            onClick={handleOpenMonthPicker}
            className="text-sm font-semibold text-slate-900 transition-colors hover:text-blue-500 dark:text-white dark:hover:text-blue-400"
          >
            {monthLabelCap}
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Próximo
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Atividades do mês */}
        {monthTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center">
            <CalendarDays size={28} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-400">
              Nenhuma atividade em {monthLabelCap}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Use os botões acima para navegar entre os meses
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Mostrando{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {monthTasks.length}
              </span>{" "}
              {monthTasks.length === 1 ? "atividade" : "atividades"}
            </p>
            <div className="space-y-2">{monthTasks.map(renderTaskRow)}</div>
          </div>
        )}

        {/* Tarefas sem data — só exibe quando o mês tem atividades */}
        {monthTasks.length > 0 && withoutDate.length > 0 && (
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

  // ── Modal "Todas as atividades do dia"
  const renderDayModal = () => {
    if (!showDayModal) return null;

    // Formata a data do modal para exibição (ex: "segunda-feira, 2 de março")
    const [year, month, day] = dayModalDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateLabel = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });

    return (
      <BaseModal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        title="Atividades do dia"
        subtitle={dateLabel}
        size="md"
      >
        <div className="space-y-2">
          {dayModalTasks.map((task) => {
            const config = TYPE_CONFIG[task.task_type as TaskType] ?? TYPE_CONFIG.other;
            const priorityConfig =
              PRIORITY_CONFIG[task.priority as Priority] ?? PRIORITY_CONFIG.normal;

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleTaskFromDayModal(task)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
              >
                {/* Ícone do tipo */}
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

                {/* Título e informações */}
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "truncate text-sm font-medium text-slate-900 dark:text-white",
                      task.is_completed ? "opacity-60 line-through" : "",
                    ].join(" ")}
                  >
                    {task.title}
                  </p>
                  {(task.card_title || task.card_client_name) && (
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {task.card_title}
                      {task.card_title && task.card_client_name && " · "}
                      {task.card_client_name}
                    </p>
                  )}
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
          })}
        </div>
      </BaseModal>
    );
  };

  // ── Modal de detalhes (somente leitura)
  const renderDetailModal = () => {
    if (!selectedTask) return null;

    const config = TYPE_CONFIG[selectedTask.task_type as TaskType] ?? TYPE_CONFIG.other;
    const priorityConfig =
      PRIORITY_CONFIG[selectedTask.priority as Priority] ?? PRIORITY_CONFIG.normal;

    return (
      <BaseModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        title={selectedTask.title}
        subtitle={config.label}
        size="md"
        footer={
          <button
            type="button"
            onClick={handleOpenCard}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ExternalLink size={16} />
            Abrir card
          </button>
        }
      >
        <div className="space-y-4">
          {/* Badges: tipo, prioridade e status */}
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
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/20 px-3 py-1 text-xs font-medium text-slate-900 dark:text-green-300">
                <CheckCircle2 size={12} />
                Concluída
              </span>
            )}
          </div>

          {/* Card e cliente */}
          {(selectedTask.card_title || selectedTask.card_client_name) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              {selectedTask.card_title && (
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedTask.card_title}
                </p>
              )}
              {selectedTask.card_client_name && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Building2 size={12} />
                  {selectedTask.card_client_name}
                </div>
              )}
            </div>
          )}

          {/* Data, hora e duração */}
          {selectedTask.due_date && (
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <CalendarDays size={16} className="flex-shrink-0 text-slate-400" />
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

          {/* Notas */}
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

  // ── Nomes dos meses para o picker
  const MONTHS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  // ── Rótulo do filtro de usuário ativo
  const activeUserLabel =
    filterUserId === null
      ? "Todos os usuários"
      : activeUsers.find((u) => u.id === filterUserId)?.name ?? "Usuário";

  // ── Renderização principal
  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Calendário Global
            </h1>
            <p className="text-xs text-slate-400">
              Todas as atividades agendadas
            </p>
          </div>
        </div>

        {/* Controle de filtro por usuário */}
        {isAdminOrManager ? (
          /* Dropdown para admin/manager */
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setShowUserDropdown((v) => !v)}
              disabled={loadingUsers}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70"
            >
              <User size={15} className="text-slate-400" />
              <span className="max-w-[160px] truncate">{activeUserLabel}</span>
              {loadingUsers ? (
                <Loader2 size={14} className="animate-spin text-slate-400" />
              ) : (
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-150 ${showUserDropdown ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {/* Opção "Todos" */}
                <button
                  type="button"
                  onClick={() => handleSelectUser(null)}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
                    filterUserId === null
                      ? "text-blue-500 font-medium"
                      : "text-slate-700 dark:text-slate-300",
                  ].join(" ")}
                >
                  Todos os usuários
                </button>

                {/* Separador */}
                <div className="my-1 border-t border-gray-100 dark:border-slate-800" />

                {/* Lista de usuários ativos */}
                {activeUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u.id)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
                      filterUserId === u.id
                        ? "text-blue-500 font-medium"
                        : "text-slate-700 dark:text-slate-300",
                    ].join(" ")}
                  >
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Badge fixo para salesperson/sdr */
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            <User size={12} />
            Minhas atividades
          </span>
        )}
      </div>

      {/* Barra de navegação do calendário */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Navegação de mês — visível apenas na view mensal */}
        {viewMode === "month" ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Título clicável que abre o seletor rápido */}
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

                  {/* Grade de meses */}
                  <div className="grid grid-cols-3 gap-1">
                    {MONTHS.map((name, index) => {
                      const isSelected =
                        pickerYear === currentMonth.getFullYear() &&
                        index === currentMonth.getMonth();
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelectMonth(index)}
                          className={[
                            "rounded-lg py-1.5 text-xs font-medium transition-colors",
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800",
                          ].join(" ")}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>

            {/* Botão Hoje */}
            <button
              type="button"
              onClick={handleToday}
              className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hoje
            </button>
          </div>
        ) : (
          /* Placeholder para manter o layout quando na view lista */
          <div />
        )}

        {/* Toggle de view (Mês / Lista) */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "month"
                ? "bg-blue-500 text-white"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
            ].join(" ")}
          >
            <CalendarDays size={14} />
            Mês
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list"
                ? "bg-blue-500 text-white"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
            ].join(" ")}
          >
            <List size={14} />
            Lista
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : viewMode === "month" ? (
        renderMonthView()
      ) : (
        renderListView()
      )}

      {/* Modal com todas as atividades de um dia (botão "+X mais") */}
      {renderDayModal()}

      {/* Modal de detalhes (somente leitura) */}
      {renderDetailModal()}
    </div>
  );
};

export default CalendarPage;
