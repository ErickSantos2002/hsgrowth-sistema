import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Play, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import cardTaskService, { CardTask } from "../services/cardTaskService";
import userService from "../services/userService";
import { User } from "../types";
import { convertBrazilToUTC, getActivityStatusBrazil } from "../utils/timezone";
import { Button, Pagination, EmptyState, LoadingSpinner } from "../components/common";
import ActivityFilters, {
  ActivityFilterState,
  DEFAULT_FILTERS,
} from "../components/activities/ActivityFilters";
import ActivityCard from "../components/activities/ActivityCard";
import FocusMode from "../components/activities/FocusMode";
import CadenciaModal from "../components/activities/CadenciaModal";

/**
 * Traduz o período selecionado no filtro para parâmetros de data da API.
 * O filtro "overdue" é tratado separadamente — usa endpoint dedicado.
 */
function getPeriodDateParams(
  period: ActivityFilterState["period"]
): { due_date_start?: string; due_date_end?: string } {
  const today = new Date();

  if (period === "today") {
    return {
      due_date_start: convertBrazilToUTC(today.toLocaleDateString("en-CA"), "00:00"),
      due_date_end: convertBrazilToUTC(today.toLocaleDateString("en-CA"), "23:59"),
    };
  }

  if (period === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      due_date_start: convertBrazilToUTC(tomorrow.toLocaleDateString("en-CA"), "00:00"),
      due_date_end: convertBrazilToUTC(tomorrow.toLocaleDateString("en-CA"), "23:59"),
    };
  }

  if (period === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      due_date_start: convertBrazilToUTC(today.toLocaleDateString("en-CA"), "00:00"),
      due_date_end: convertBrazilToUTC(weekEnd.toLocaleDateString("en-CA"), "23:59"),
    };
  }

  // "all" — sem filtro de data
  return {};
}

/** Ordem de classificação para ordenação frontend: atrasadas → hoje → amanhã → futuras */
const STATUS_ORDER: Record<string, number> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  future: 3,
};

function sortTasks(tasks: CardTask[]): CardTask[] {
  return [...tasks].sort((a, b) => {
    const statusA = a.due_date ? getActivityStatusBrazil(a.due_date) : "future";
    const statusB = b.due_date ? getActivityStatusBrazil(b.due_date) : "future";
    const orderDiff = (STATUS_ORDER[statusA] ?? 3) - (STATUS_ORDER[statusB] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return dateA - dateB;
  });
}

const PAGE_SIZE = 10;

/**
 * Página de Atividades — centraliza todas as atividades pendentes do usuário.
 *
 * Permissões:
 * - Admin/Gerente: veem filtro de responsável, sem botão "Iniciar"
 * - Vendedor/SDR: botão "Iniciar Atividades" disponível
 * - Viewer: acesso somente leitura
 */
const Activities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isViewer = user?.role === "viewer";
  const canStartFocus = user?.role === "salesperson" || user?.role === "sdr";

  // ─── Estado ──────────────────────────────────────────────────────────────────

  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_FILTERS);
  const [users, setUsers] = useState<User[]>([]);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [focusTasks, setFocusTasks] = useState<CardTask[]>([]);
  const [cadenciaModalOpen, setCadenciaModalOpen] = useState(false);

  // Carrega lista de usuários ativos para o filtro de responsável (admin/manager)
  useEffect(() => {
    if (!isAdminOrManager) return;
    userService.listActive().then(setUsers).catch(console.error);
  }, [isAdminOrManager]);

  // ─── Busca de atividades ─────────────────────────────────────────────────────

  const fetchTasks = useCallback(async (activeFilters: ActivityFilterState, page: number) => {
    setLoading(true);
    try {
      // Período "overdue" usa endpoint dedicado — pagina no frontend
      if (activeFilters.period === "overdue") {
        const userId = activeFilters.assignedToId ?? (isAdminOrManager ? undefined : user?.id);
        const overdueTasks = await cardTaskService.getOverdue(userId ?? undefined);

        // Aplica filtros locais de tipo e prioridade (endpoint /overdue não os suporta)
        const filtered = overdueTasks.filter((t) => {
          if (activeFilters.taskType && t.task_type !== activeFilters.taskType) return false;
          if (activeFilters.priority && t.priority !== activeFilters.priority) return false;
          return true;
        });

        // Paginação client-side: fatia a página atual
        const totalFiltered = filtered.length;
        const totalPagesCalc = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
        const safePage = Math.min(page, totalPagesCalc);
        const start = (safePage - 1) * PAGE_SIZE;
        const paginated = filtered.slice(start, start + PAGE_SIZE);

        setTasks(paginated);
        setTotal(totalFiltered);
        setTotalPages(totalPagesCalc);
        setCurrentPage(safePage);
        return;
      }

      const dateParams = getPeriodDateParams(activeFilters.period);
      const response = await cardTaskService.list({
        ...dateParams,
        task_type: activeFilters.taskType || undefined,
        priority: activeFilters.priority || undefined,
        assigned_to_id: activeFilters.assignedToId ?? (isAdminOrManager ? undefined : user?.id ?? undefined),
        is_completed: false,
        page,
        page_size: PAGE_SIZE,
      });

      setTasks(response.tasks);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao buscar atividades:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrManager, user?.id]);

  useEffect(() => {
    fetchTasks(filters, currentPage);
  }, [filters, currentPage, fetchTasks]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleFiltersChange = (newFilters: ActivityFilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleNavigateToCard = (cardId: number) => {
    navigate(`/cards/${cardId}`);
  };

  const handleStartFocus = () => {
    setFocusTasks(sortedTasks);
    setFocusModeOpen(true);
  };

  // ─── Dados derivados ──────────────────────────────────────────────────────────

  const sortedTasks = sortTasks(tasks);

  // Props de paginação server-side para o componente Pagination
  const paginationProps = {
    currentPage,
    totalPages,
    totalItems: total,
    startIndex: (currentPage - 1) * PAGE_SIZE,
    endIndex: Math.min(currentPage * PAGE_SIZE, total),
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage: setCurrentPage,
    goToNextPage: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    goToPrevPage: () => setCurrentPage((p) => Math.max(1, p - 1)),
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <CheckSquare size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Atividades
            </h1>
            {!loading && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {total} {total === 1 ? "atividade pendente" : "atividades pendentes"}
              </p>
            )}
          </div>
        </div>

        {/* Botões — apenas para vendedor e SDR */}
        {canStartFocus && (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setCadenciaModalOpen(true)}
              icon={<Zap size={16} />}
              className="flex-1 sm:flex-none"
            >
              Disparo em Lote
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={sortedTasks.length === 0 || loading}
              onClick={handleStartFocus}
              icon={<Play size={16} />}
              title={sortedTasks.length === 0 ? "Nenhuma atividade para iniciar" : "Iniciar sessão de foco"}
              className="flex-1 sm:flex-none"
            >
              Iniciar Atividades
            </Button>
          </div>
        )}
      </div>

      {/* Container principal — envolve filtros + lista + paginação */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
        {/* Barra de filtros */}
        <div className="border-b border-gray-200 dark:border-slate-700/50">
          <ActivityFilters
            filters={filters}
            onChange={handleFiltersChange}
            users={users}
            isAdminOrManager={isAdminOrManager}
          />
        </div>

        {/* Conteúdo: loading / empty / lista */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" label="Carregando atividades..." />
            </div>
          ) : sortedTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Nenhuma atividade encontrada"
              description="Tente ajustar os filtros ou aproveite o tempo livre!"
            />
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <ActivityCard
                  key={task.id}
                  task={task}
                  onNavigateToCard={handleNavigateToCard}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {!loading && sortedTasks.length > 0 && (
          <Pagination {...paginationProps} itemLabel="atividades" />
        )}
      </div>

      {/* Modal de cadências */}
      <CadenciaModal
        isOpen={cadenciaModalOpen}
        onClose={() => setCadenciaModalOpen(false)}
      />

      {/* Modal de foco fullscreen */}
      <FocusMode
        isOpen={focusModeOpen}
        onClose={() => setFocusModeOpen(false)}
        tasks={focusTasks}
        onSessionEnd={() => fetchTasks(filters, currentPage)}
        isViewer={isViewer}
      />
    </div>
  );
};

export default Activities;
