import React from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Target, Clock,
  AlertTriangle, Trophy, Medal, Award, Percent, Ticket,
  CalendarCheck, Users,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DashboardKPIs } from "../../types";
import { getChartColors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import KpiCard from "./KpiCard";

interface DashboardVendedorProps {
  kpis: DashboardKPIs;
  periodLabel: string;
}

const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const DashboardVendedor: React.FC<DashboardVendedorProps> = ({ kpis, periodLabel }) => {
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const ticketMedio =
    kpis.won_cards_this_month > 0
      ? kpis.won_value_this_month / kpis.won_cards_this_month
      : 0;

  const funnelData = (kpis.cards_by_stage ?? []).map((s, i) => ({
    name: s.stage_name,
    value: s.card_count,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  // Distribuição do pipeline por etapa
  const pipelineTotal = kpis.cards_by_stage?.reduce((sum, s) => sum + s.total_value, 0) ?? 0;

  return (
    <div className="space-y-6">

      {/* ── 1. BIG NUMBERS ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Visão Geral · {periodLabel}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            icon={<DollarSign size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Pipeline Total"
            value={kpis.pipeline_value}
            format="currency"
            highlight="green"
            sub="Valor em aberto"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-blue-400" />}
            iconBg="bg-blue-500/20"
            label={`Receita · ${periodLabel}`}
            value={kpis.won_value_this_month}
            format="currency"
            highlight="blue"
            sub={<span className="text-emerald-500">{kpis.won_cards_this_month} deals fechados</span>}
          />
          <KpiCard
            icon={<Percent size={18} className="text-purple-400" />}
            iconBg="bg-purple-500/20"
            label="Taxa de Fechamento"
            value={kpis.conversion_rate_this_month}
            format="percent"
            highlight="purple"
            sub="% conversão no período"
          />
          <KpiCard
            icon={<Ticket size={18} className="text-orange-400" />}
            iconBg="bg-orange-500/20"
            label="Ticket Médio"
            value={ticketMedio}
            format="currency"
            highlight="orange"
            sub="Valor médio por deal"
          />
          <KpiCard
            icon={<Clock size={18} className="text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            label="Tempo Médio p/ Fechar"
            value={kpis.avg_time_to_win_days}
            format="days"
            sub="Dias até ganhar o deal"
          />
        </div>

        {/* Segunda linha */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <KpiCard
            icon={<Users size={18} className="text-blue-400" />}
            iconBg="bg-blue-500/20"
            label="Novos Leads"
            value={kpis.new_cards_this_month}
            format="number"
            sub={`${kpis.new_cards_today} hoje`}
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Reuniões Recebidas (SDR)"
            value={null}
            unavailable
            sub="Em breve"
          />
          <KpiCard
            icon={<Target size={18} className="text-yellow-400" />}
            iconBg="bg-yellow-500/20"
            label="Propostas Geradas"
            value={null}
            unavailable
            sub="Em breve"
          />
          <KpiCard
            icon={<TrendingDown size={18} className="text-red-400" />}
            iconBg="bg-red-500/20"
            label="Perdidos"
            value={kpis.lost_cards_this_month}
            format="number"
            highlight="red"
            sub={`${kpis.lost_cards_today} hoje`}
          />
        </div>
      </section>

      {/* ── 2. RITMO OPERACIONAL ───────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Evolução de vendas */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Evolução de Vendas</h3>
          </div>
          {kpis.sales_evolution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={kpis.sales_evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="period" tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.surface.elevated, border: `1px solid ${chartColors.border.default}`, borderRadius: 8, fontSize: 12, color: darkMode ? "#ffffff" : "#0f172a" }}
                  labelStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  itemStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  formatter={(v: number, name: string) => [
                    name === "won_value" ? fmt(v) : v,
                    name === "won_count" ? "Ganhos" : name === "lost_count" ? "Perdidos" : "Receita",
                  ]}
                />
                <Line type="monotone" dataKey="won_count" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} name="won_count" />
                <Line type="monotone" dataKey="lost_count" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="lost_count" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>

        {/* Pipeline por etapa */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Target size={16} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pipeline por Etapa</h3>
          </div>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartColors.content.secondary, fontSize: 10 }} angle={-35} textAnchor="end" height={60} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.surface.elevated, border: `1px solid ${chartColors.border.default}`, borderRadius: 8, fontSize: 12, color: darkMode ? "#ffffff" : "#0f172a" }}
                  labelStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  itemStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  formatter={(v: number) => [v, "Cards"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>
      </section>

      {/* ── 3. CONVERSÃO ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Funil de Conversão
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { label: "Reunião → Qualificação", value: null },
            { label: "Qualificação → Proposta", value: null },
            { label: "Proposta → Ganho", value: null },
            { label: "Taxa Geral", value: kpis.conversion_rate_this_month },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-slate-700/50 dark:bg-slate-800/50">
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              {item.value !== null ? (
                <p className="text-2xl font-bold text-emerald-500">{item.value.toFixed(1)}%</p>
              ) : (
                <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">—</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. PIPELINE SAÚDE ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Saúde do Pipeline
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Pipeline Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(pipelineTotal || kpis.pipeline_value)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Pipeline vs Meta</p>
            <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">—</p>
            <p className="text-xs text-slate-400">Em breve</p>
          </div>
        </div>
      </section>

      {/* ── 5. RANKING ────────────────────────────────────────────── */}
      {kpis.top_sellers_this_month?.length > 0 && (
        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-yellow-500/20 p-2">
                <Trophy size={16} className="text-yellow-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ranking Vendedores · {periodLabel}
              </h3>
            </div>
            <div className="space-y-2">
              {kpis.top_sellers_this_month.slice(0, 5).map((seller, i) => {
                const icons = [
                  <Trophy key={0} size={16} className="text-yellow-400" />,
                  <Medal  key={1} size={16} className="text-slate-400" />,
                  <Award  key={2} size={16} className="text-orange-400" />,
                ];
                const borders = [
                  "border-yellow-500/30 bg-yellow-500/5",
                  "border-slate-500/20 bg-slate-500/5",
                  "border-orange-500/20 bg-orange-500/5",
                  "border-gray-200 dark:border-slate-700/50",
                  "border-gray-200 dark:border-slate-700/50",
                ];
                return (
                  <div key={i} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${borders[i] ?? borders[3]}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center">
                        {icons[i] ?? <span className="text-sm font-bold text-slate-400">#{i + 1}</span>}
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{seller.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-500">{fmt(seller.total_value)}</p>
                      <p className="text-xs text-slate-400">{seller.cards_won} fechados</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. RISCOS ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
          Atenção · Riscos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Cards Vencidos</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">{kpis.overdue_cards}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {kpis.due_today} vencem hoje · {kpis.due_this_week} esta semana
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-orange-400">Negócios Parados (7d)</h3>
            </div>
            <p className="text-3xl font-bold text-orange-400">—</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Em breve</p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target size={16} className="text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-500">Propostas em Aberto</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">—</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Em breve</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardVendedor;
