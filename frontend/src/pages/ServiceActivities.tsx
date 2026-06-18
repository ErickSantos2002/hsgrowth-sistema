import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckSquare, ExternalLink, Wrench } from "lucide-react";
import serviceActivityService, { ServiceActivityOverviewItem } from "../services/serviceActivityService";
import { Pagination, EmptyState, LoadingSpinner } from "../components/common";
import ActivityFilters, {
  ActivityFilterState,
  DEFAULT_FILTERS,
} from "../components/activities/ActivityFilters";
import StatusBadge from "../components/cardDetails/StatusBadge";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../constants/cardTaskConfig";
import { convertUTCToBrazil, formatBrazilDateTime, getActivityStatusBrazil } from "../utils/timezone";

const PAGE_SIZE = 10;

// ─── Card individual (mesmo padrão do board de Vendas, link para o card de serviço) ──
const ServiceActivityCard: React.FC<{
  item: ServiceActivityOverviewItem;
  onNavigate: () => void;
}> = ({ item, onNavigate }) => {
  const typeConfig = TYPE_CONFIG[(item.activity_type as keyof typeof TYPE_CONFIG)] ?? TYPE_CONFIG.other;
  const priorityConfig = PRIORITY_CONFIG[(item.priority as keyof typeof PRIORITY_CONFIG)] ?? PRIORITY_CONFIG.normal;
  const activityStatus = item.due_date ? getActivityStatusBrazil(item.due_date) : "future";

  const borderColor =
    item.priority === "urgent" ? "border-l-red-500"
    : item.priority === "high" ? "border-l-yellow-500"
    : "border-l-transparent";

  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 border-l-4 bg-white transition-all hover:border-gray-300 dark:border-slate-700/60 dark:bg-slate-900/50 dark:hover:border-slate-600 ${borderColor}`}>
      <div className="p-4">
        {/* Header: ícone + título + badges */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-slate-500 dark:text-slate-400">
            <typeConfig.Icon size={16} />
          </span>
          <p className="min-w-0 flex-1 font-medium text-slate-900 dark:text-white">
            {item.title || typeConfig.label}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${typeConfig.pillBg} ${typeConfig.pillText} ${typeConfig.pillBorder}`}>
              {typeConfig.label}
            </span>
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${priorityConfig.badgeClass}`}>
              {priorityConfig.label}
            </span>
          </div>
        </div>

        {/* Status + data + responsável */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {item.due_date && <StatusBadge status={activityStatus} />}
          {item.due_date && <span>{formatBrazilDateTime(item.due_date)}</span>}
          {item.user_name && (
            <>
              <span>•</span>
              <span>{item.user_name}</span>
            </>
          )}
        </div>

        {/* Linha de contexto: card de serviço com link */}
        {item.card_title && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Link
              to={`/servicos/${item.board_id}/cards/${item.service_card_id}`}
              onClick={onNavigate}
              className="flex items-center gap-1 text-blue-500 transition-colors hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ExternalLink size={11} />
              {item.card_title}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Página de Atividades do módulo de SERVIÇO.
 * Lista as atividades (tarefas) de todos os cards de serviço, de todos os
 * usuários — não há divisão por responsável no módulo de serviço.
 * Segue o mesmo padrão visual da página de Atividades de Vendas.
 */
const ServiceActivities: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceActivityOverviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Abre em "Hoje", igual ao board de Vendas.
  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setItems(await serviceActivityService.listAll("pending")); // só pendentes
      } catch (e) {
        console.error("Erro ao carregar atividades de serviço:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Filtragem client-side (período / tipo / prioridade) ──────────────────────
  const filtered = useMemo(() => {
    const inPeriod = (due?: string | null): boolean => {
      if (filters.period === "all") return true;
      if (!due) return false;
      const status = getActivityStatusBrazil(due);
      if (filters.period === "overdue") return status === "overdue";
      if (filters.period === "today") return status === "today";
      if (filters.period === "tomorrow") return status === "tomorrow";
      if (filters.period === "week") {
        const d = convertUTCToBrazil(due);
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return d >= start && d < end;
      }
      return true;
    };

    return items.filter((it) => {
      if (!inPeriod(it.due_date)) return false;
      if (filters.taskType && it.activity_type !== filters.taskType) return false;
      if (filters.priority && (it.priority || "normal") !== filters.priority) return false;
      return true;
    });
  }, [items, filters]);

  // Reseta a página ao mudar filtros
  const handleFiltersChange = (f: ActivityFilterState) => {
    setFilters(f);
    setCurrentPage(1);
  };

  // ── Paginação client-side ────────────────────────────────────────────────────
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const paginationProps = {
    currentPage: safePage,
    totalPages,
    totalItems: total,
    startIndex: (safePage - 1) * PAGE_SIZE,
    endIndex: Math.min(safePage * PAGE_SIZE, total),
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
    goToPage: setCurrentPage,
    goToNextPage: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    goToPrevPage: () => setCurrentPage((p) => Math.max(1, p - 1)),
  };

  return (
    <div className={embedded ? "" : "p-6"}>
      {/* Header (oculto quando embutido na página de Atividades do admin) */}
      {!embedded && (
        <div className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <Wrench size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Atividades</h1>
              {!loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {total} {total === 1 ? "atividade pendente" : "atividades pendentes"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Container principal — filtros + lista + paginação */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
        <div className="border-b border-gray-200 dark:border-slate-700/50">
          <ActivityFilters
            filters={filters}
            onChange={handleFiltersChange}
            users={[]}
            isAdminOrManager={false}
          />
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" label="Carregando atividades..." />
            </div>
          ) : pageItems.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Nenhuma atividade encontrada"
              description="Tente ajustar os filtros ou aproveite o tempo livre!"
            />
          ) : (
            <div className="space-y-3">
              {pageItems.map((it) => (
                <ServiceActivityCard
                  key={it.id}
                  item={it}
                  onNavigate={() => navigate(`/servicos/${it.board_id}/cards/${it.service_card_id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && total > 0 && (
          <Pagination {...paginationProps} itemLabel="atividades" />
        )}
      </div>
    </div>
  );
};

export default ServiceActivities;
