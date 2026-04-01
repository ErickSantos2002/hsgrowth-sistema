import React from "react";
import {
  UserPlus, Users, CalendarCheck, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Activity, Trophy, Medal, Award,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DashboardKPIs } from "../../types";
import { getChartColors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import KpiCard from "./KpiCard";

interface DashboardSDRProps {
  kpis: DashboardKPIs;
  periodLabel: string;
}

const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const DashboardSDR: React.FC<DashboardSDRProps> = ({ kpis, periodLabel }) => {
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  // Extrai contagens por etapa do funil (nomes flexíveis)
  const getStageCount = (name: string) => {
    const stage = kpis.cards_by_stage?.find(
      (s) => s.stage_name.toLowerCase().includes(name.toLowerCase())
    );
    return stage?.card_count ?? null;
  };

  const emProspeccao = getStageCount("prospeç");
  const agendados    = getStageCount("agendad");
  const conectados   = getStageCount("conectad");

  // Funil SDR simplificado para gráfico de barras
  const funnelData = (kpis.cards_by_stage ?? []).map((s, i) => ({
    name: s.stage_name,
    value: s.card_count,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <div className="space-y-6">

      {/* ── 1. BIG NUMBERS ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Visão Geral · {periodLabel}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          <KpiCard
            icon={<UserPlus size={18} className="text-blue-400" />}
            iconBg="bg-blue-500/20"
            label="Novos Leads"
            value={kpis.new_cards_this_month}
            format="number"
            highlight="blue"
            sub={
              <span>
                <span className="font-medium">{kpis.new_cards_this_week}</span> esta semana ·{" "}
                <span className="font-medium">{kpis.new_cards_today}</span> hoje
              </span>
            }
          />
          <KpiCard
            icon={<Activity size={18} className="text-purple-400" />}
            iconBg="bg-purple-500/20"
            label="Em Prospecção"
            value={emProspeccao}
            format="number"
            highlight="purple"
            sub="Cards ativos em prospecção"
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Reuniões Agendadas"
            value={agendados}
            format="number"
            highlight="green"
            sub="Cards no estágio Agendado"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            label="Conectados"
            value={conectados}
            format="number"
            sub="Cards no estágio Conectado"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-yellow-400" />}
            iconBg="bg-yellow-500/20"
            label="Taxa de Conexão"
            value={null}
            unavailable
            sub="Em breve"
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-orange-400" />}
            iconBg="bg-orange-500/20"
            label="Taxa de Agendamento"
            value={null}
            unavailable
            sub="Em breve"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Total de Ganhos"
            value={kpis.won_cards_this_month}
            format="number"
            highlight="green"
            sub={<span className="text-emerald-500">{fmt(kpis.won_value_this_month)}</span>}
          />
          <KpiCard
            icon={<TrendingDown size={18} className="text-red-400" />}
            iconBg="bg-red-500/20"
            label="Leads Perdidos"
            value={kpis.lost_cards_this_month}
            format="number"
            highlight="red"
            sub={`${kpis.lost_cards_today} hoje · ${kpis.lost_cards_this_week} esta semana`}
          />
        </div>
      </section>

      {/* ── 2. RITMO OPERACIONAL ───────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Novos leads por dia */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <UserPlus size={16} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Evolução de Leads
            </h3>
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
                  formatter={(v: number, name: string) => [v, name === "won_count" ? "Ganhos" : name === "lost_count" ? "Perdidos" : name]}
                />
                <Line type="monotone" dataKey="won_count" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} name="Ganhos" />
                <Line type="monotone" dataKey="lost_count" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="Perdidos" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>

        {/* Funil por etapa */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <Activity size={16} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cards por Etapa
            </h3>
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
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>
      </section>

      {/* ── 3. CONVERSÃO (taxas do funil) ─────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Conversão
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { label: "Lead → Conectado", value: null },
            { label: "Conectado → Agendado", value: null },
            { label: "Lead → Agendado", value: null },
            { label: "Agendado → Ganho", value: kpis.conversion_rate_this_month },
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

      {/* ── 4. RANKING SDR ────────────────────────────────────────── */}
      {kpis.top_sellers_this_month?.length > 0 && (
        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-yellow-500/20 p-2">
                <Trophy size={16} className="text-yellow-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ranking · {periodLabel}
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

      {/* ── 5. RISCOS ─────────────────────────────────────────────── */}
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
              <h3 className="text-sm font-semibold text-orange-400">Leads sem Contato</h3>
            </div>
            <p className="text-3xl font-bold text-orange-400">—</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Em breve</p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={16} className="text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-500">Parados +3 dias</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">—</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Em breve</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardSDR;
