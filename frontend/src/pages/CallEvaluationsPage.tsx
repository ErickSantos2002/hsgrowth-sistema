import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Star, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import callEvaluationService, {
  CallEvaluation,
  CallEvaluationListParams,
} from "../services/callEvaluationService";
import {
  EvaluationCard,
  classificationColor,
} from "../components/cardDetails/CallEvaluationsSection";
import { Pagination, EmptyState, LoadingSpinner, SelectMenu } from "../components/common";

const PAGE_SIZE = 10;

type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "quarter", label: "Este Trimestre" },
  { value: "year", label: "Este Ano" },
  { value: "custom", label: "Personalizado" },
];

const CLASSIFICATION_OPTIONS = [
  { value: "", label: "Todas as classificações" },
  { value: "Excelente", label: "Excelente" },
  { value: "Boa", label: "Boa" },
  { value: "Regular", label: "Regular" },
  { value: "Fraca", label: "Fraca" },
  { value: "Crítica", label: "Crítica" },
];

const CLASSIFICATIONS = ["Excelente", "Boa", "Regular", "Fraca", "Crítica"];

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto";

/** Converte um preset de período em date_from / date_to (strings YYYY-MM-DD). */
function getPeriodDates(period: PeriodType): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "today") {
    return { dateFrom: today, dateTo: today };
  }
  if (period === "week") {
    const d = new Date(now);
    // Segunda-feira da semana atual
    const day = d.getDay(); // 0=dom, 1=seg...
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return { dateFrom: d.toISOString().split("T")[0], dateTo: today };
  }
  if (period === "month") {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return { dateFrom: `${y}-${m}-01`, dateTo: today };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const startMonth = String(q * 3 + 1).padStart(2, "0");
    return { dateFrom: `${now.getFullYear()}-${startMonth}-01`, dateTo: today };
  }
  if (period === "year") {
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: today };
  }
  // "custom" — retorna vazio; os inputs controlam
  return { dateFrom: "", dateTo: "" };
}

const CallEvaluationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  // ─── Estado ─────────────────────────────────────────────────────────────────

  const [items, setItems] = useState<CallEvaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [byClassification, setByClassification] = useState<Record<string, number>>({});

  const [vendedores, setVendedores] = useState<string[]>([]);
  const [filterVendedor, setFilterVendedor] = useState("");
  const [filterClassification, setFilterClassification] = useState("");

  // Filtro de período
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split("T")[0]);

  // Datas efetivas enviadas à API
  const { dateFrom, dateTo } = period === "custom"
    ? { dateFrom: customStart, dateTo: customEnd }
    : getPeriodDates(period);

  // Carrega lista de vendedores para o dropdown (só manager/admin)
  useEffect(() => {
    if (!isManagerOrAdmin) return;
    callEvaluationService.listVendedores()
      .then(setVendedores)
      .catch(console.error);
  }, [isManagerOrAdmin]);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (page: number, params: CallEvaluationListParams) => {
    setLoading(true);
    try {
      const res = await callEvaluationService.list({ ...params, page, page_size: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setAverageScore(res.average_score);
      setByClassification(res.by_classification);
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentPage, {
      vendedor_name: filterVendedor || undefined,
      classification: filterClassification || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
  }, [currentPage, filterVendedor, filterClassification, dateFrom, dateTo, fetchData]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleFilterChange(setter: React.Dispatch<React.SetStateAction<string>>, value: string) {
    setter(value);
    setCurrentPage(1);
  }

  function handlePeriodChange(value: string) {
    const newPeriod = value as PeriodType;
    if (newPeriod === "custom") {
      setCustomEnd(new Date().toISOString().split("T")[0]);
    }
    setPeriod(newPeriod);
    setCurrentPage(1);
  }

  const hasActiveFilters = !!(filterVendedor || filterClassification || period !== "month");

  // ─── Paginação ──────────────────────────────────────────────────────────────

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

  // ─── Cor da nota média ───────────────────────────────────────────────────────

  const avgScoreColor =
    averageScore === null
      ? "text-slate-400"
      : averageScore >= 7
      ? "text-emerald-600 dark:text-emerald-400"
      : averageScore >= 5
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const goodCount = (byClassification["Excelente"] ?? 0) + (byClassification["Boa"] ?? 0);
  const badCount = (byClassification["Fraca"] ?? 0) + (byClassification["Crítica"] ?? 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Phone size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ligações</h1>
          {!loading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total} {total === 1 ? "avaliação registrada" : "avaliações registradas"}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Phone size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Total</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? "—" : total}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Star size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Nota Média</span>
          </div>
          <p className={`mt-1 text-2xl font-bold ${avgScoreColor}`}>
            {loading ? "—" : averageScore !== null ? `${averageScore.toFixed(1)}/10` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Excelente + Boa</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : goodCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Fraca + Crítica</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {loading ? "—" : badCount}
          </p>
        </div>
      </div>

      {/* Badges por classificação */}
      {!loading && total > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {CLASSIFICATIONS.map((cls) => {
            const count = byClassification[cls] ?? 0;
            if (count === 0) return null;
            return (
              <span
                key={cls}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classificationColor[cls]}`}
              >
                {cls} ({count})
              </span>
            );
          })}
        </div>
      )}

      {/* Container principal */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
        {/* Filtros */}
        <div className="flex flex-col items-stretch gap-3 border-b border-gray-200 p-4 dark:border-slate-700/50 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Filtro por vendedor — só aparece para manager/admin */}
          {isManagerOrAdmin && (
            <select
              value={filterVendedor}
              onChange={(e) => handleFilterChange(setFilterVendedor, e.target.value)}
              className={selectClass}
            >
              <option value="">Todos os vendedores</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* Filtro por classificação */}
          <select
            value={filterClassification}
            onChange={(e) => handleFilterChange(setFilterClassification, e.target.value)}
            className={selectClass}
          >
            {CLASSIFICATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Filtro de período */}
          <div className="min-w-[160px]">
            <SelectMenu
              size="sm"
              value={period}
              options={PERIOD_OPTIONS}
              onChange={handlePeriodChange}
            />
          </div>

          {/* Inputs de data personalizada */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => { setCustomStart(e.target.value); setCurrentPage(1); }}
                className={selectClass}
              />
              <span className="text-sm text-slate-400">até</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => { setCustomEnd(e.target.value); setCurrentPage(1); }}
                className={selectClass}
              />
            </div>
          )}

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterVendedor("");
                setFilterClassification("");
                setPeriod("month");
                setCurrentPage(1);
              }}
              className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" label="Carregando avaliações..." />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="Nenhuma avaliação encontrada"
              description="Tente ajustar os filtros ou aguarde novas ligações serem processadas pelo agente de IA."
            />
          ) : (
            <div className="space-y-3">
              {items.map((ev) => (
                <EvaluationCard
                  key={ev.id}
                  evaluation={ev}
                  onCardClick={(cardId) => navigate(`/cards/${cardId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {!loading && items.length > 0 && (
          <Pagination {...paginationProps} itemLabel="avaliações" />
        )}
      </div>
    </div>
  );
};

export default CallEvaluationsPage;
