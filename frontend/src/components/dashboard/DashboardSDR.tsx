import React from "react";
import {
  UserPlus, Users, CalendarCheck, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Activity, Trophy, Medal, Award, RotateCcw, Info,
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

  // IDs fixos das listas do board Prospecção
  const LIST_PROSPECCAO = 23;
  const LIST_AGENDADO   = 26;
  const LIST_CONECTADO  = 24;

  const getStageCount = (listId: number) => {
    const stage = kpis.cards_by_stage?.find((s) => s.list_id === listId);
    return stage?.card_count ?? null;
  };

  const emProspeccao = getStageCount(LIST_PROSPECCAO);
  const agendados    = getStageCount(LIST_AGENDADO);
  const conectados   = getStageCount(LIST_CONECTADO);

  const newLeads = kpis.new_cards_this_month;

  // Taxa Lead → Prospecção
  const taxaLeadProspeccao =
    newLeads > 0 && emProspeccao !== null
      ? Math.round((emProspeccao / newLeads) * 1000) / 10
      : null;
  // Taxa Prospecção → Conectado
  const taxaConexao =
    emProspeccao !== null && emProspeccao > 0 && conectados !== null
      ? Math.round((conectados / emProspeccao) * 1000) / 10
      : null;
  // Taxa Conectado → Agendado
  const taxaConectadoAgendado =
    conectados !== null && conectados > 0 && agendados !== null
      ? Math.round((agendados / conectados) * 1000) / 10
      : null;
  // Taxa Lead → Agendado
  const taxaLeadAgendado =
    newLeads > 0 && agendados !== null
      ? Math.round((agendados / newLeads) * 1000) / 10
      : null;
  // Taxa Prospecção → Agendado
  const taxaAgendamento =
    emProspeccao !== null && emProspeccao > 0 && agendados !== null
      ? Math.round((agendados / emProspeccao) * 1000) / 10
      : null;
  // Taxa Agendado → Ganho
  const taxaAgendadoGanho =
    agendados !== null && agendados > 0
      ? Math.round((kpis.won_cards_this_month / agendados) * 1000) / 10
      : null;

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
        {/* Linha 1 — 6 cards (funil SDR) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 xl:grid-cols-6">
          <KpiCard
            icon={<UserPlus size={18} className="text-blue-400" />}
            iconBg="bg-blue-500/20"
            label="Novos Leads"
            value={kpis.new_cards_this_month}
            format="number"
            highlight="blue"
            info="Leads que entraram no funil de Prospecção no período (para esta visão de SDR)."
            sub={
              <span>
                <span className="font-medium">{kpis.new_cards_this_week}</span> esta semana ·{" "}
                <span className="font-medium">{kpis.new_cards_today}</span> hoje
              </span>
            }
            className="sm:col-span-2 xl:col-span-1"
          />
          <KpiCard
            icon={<Activity size={18} className="text-purple-400" />}
            iconBg="bg-purple-500/20"
            label="Em Prospecção"
            value={emProspeccao}
            format="number"
            highlight="purple"
            info="Cards que entraram na etapa Prospecção no período (conta a passagem pela etapa, não quantos estão nela agora)."
            sub="Entraram em Prospecção no período"
            className="sm:col-span-2 xl:col-span-1"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            label="Conectados"
            value={conectados}
            format="number"
            info="Cards que entraram na etapa Conectado no período (o SDR conseguiu contato)."
            sub="Entraram em Conectado no período"
            className="sm:col-span-2 xl:col-span-1"
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Reuniões Agendadas"
            value={agendados}
            format="number"
            highlight="green"
            info="Reuniões que o SDR agendou no período — cards que entraram na etapa Agendado. Como uma automação move o card para a Aquisição, a etapa fica vazia; por isso contamos quantos passaram por lá, não quantos estão nela agora."
            sub="Reuniões agendadas no período"
            className="sm:col-span-2 xl:col-span-1"
          />
          <KpiCard
            icon={<RotateCcw size={18} className="text-amber-400" />}
            iconBg="bg-amber-500/20"
            label="Reagendadas"
            value={kpis.rescheduled_meetings ?? 0}
            format="number"
            highlight="yellow"
            info="Reuniões marcadas como no-show no período (o cliente não compareceu e a reunião precisou ser remarcada)."
            sub="No-shows no período"
            className="sm:col-span-2 xl:col-span-1"
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-teal-400" />}
            iconBg="bg-teal-500/20"
            label="Reuniões Qualificadas"
            value={kpis.qualified_meetings ?? 0}
            format="number"
            highlight="green"
            info="Reuniões que o vendedor qualificou: o card avançou para a etapa Qualificação (board de Aquisição) no período. É um subconjunto das agendadas."
            sub="Avançaram para Qualificação"
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>

        {/* Linha 2 — 4 cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<TrendingUp size={18} className="text-yellow-400" />}
            iconBg="bg-yellow-500/20"
            label="Taxa de Conexão"
            value={taxaConexao}
            format="percent"
            highlight="blue"
            info="Conversão Prospecção → Conectado no período: dos cards que passaram por Prospecção, quantos avançaram para Conectado (o SDR conseguiu contato)."
            sub="Prospecção → Conectado"
          />
          <KpiCard
            icon={<CalendarCheck size={18} className="text-orange-400" />}
            iconBg="bg-orange-500/20"
            label="Taxa de Agendamento"
            value={taxaAgendamento}
            format="percent"
            highlight="orange"
            info="Conversão Prospecção → Agendado no período: dos cards que passaram por Prospecção, quantos viraram reunião agendada."
            sub="Prospecção → Agendado"
          />
          <KpiCard
            icon={<TrendingUp size={18} className="text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            label="Total de Ganhos"
            value={kpis.won_cards_this_month}
            format="number"
            highlight="green"
            info="Negócios marcados como ganho no período (o valor total ganho aparece abaixo)."
            sub={<span className="text-emerald-500">{fmt(kpis.won_value_this_month)}</span>}
          />
          <KpiCard
            icon={<TrendingDown size={18} className="text-red-400" />}
            iconBg="bg-red-500/20"
            label="Leads Perdidos"
            value={kpis.lost_cards_this_month}
            format="number"
            highlight="red"
            info="Negócios/leads marcados como perdidos no período."
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
                  formatter={(v: number, name: string) => [v, name === "new_leads_count" ? "Novos Leads" : name === "meetings_count" ? "Reuniões Agendadas" : name]}
                />
                <Line type="monotone" dataKey="new_leads_count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="Novos Leads" />
                <Line type="monotone" dataKey="meetings_count" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} name="Reuniões Agendadas" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>

        {/* Atividades por tipo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <Activity size={16} className="text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Atividades no Período
              </h3>
            </div>
            {(kpis.activity_counts_by_type?.length ?? 0) > 0 && (
              <span className="ml-auto rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
                {kpis.activity_counts_by_type.reduce((sum, a) => sum + a.count, 0)} atividades
              </span>
            )}
          </div>
          {(kpis.activity_counts_by_type?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={kpis.activity_counts_by_type.map((a) => ({
                  name: a.type === "call" ? "Ligação" : a.type === "meeting" ? "Reunião" : a.type === "follow_up" ? "Follow-up" : a.type === "task" ? "Tarefa" : a.type,
                  count: a.count,
                  color: a.type === "call" ? "#3b82f6" : a.type === "meeting" ? "#10b981" : a.type === "follow_up" ? "#f59e0b" : "#8b5cf6",
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.surface.elevated, border: `1px solid ${chartColors.border.default}`, borderRadius: 8, fontSize: 12, color: darkMode ? "#ffffff" : "#0f172a" }}
                  labelStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  itemStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  formatter={(v: number) => [v, "Atividades"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {kpis.activity_counts_by_type.map((_, index) => (
                    <Cell key={index} fill={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem atividades no período</div>
          )}
        </div>
      </section>

      {/* ── 3. CONVERSÃO (taxas do funil) ─────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Conversão
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Lead → Prospecção",      value: taxaLeadProspeccao },
            { label: "Prospecção → Conectado", value: taxaConexao },
            { label: "Conectado → Agendado",   value: taxaConectadoAgendado },
            { label: "Lead → Agendado",        value: taxaLeadAgendado },
            { label: "Prospecção → Agendado",  value: taxaAgendamento },
            { label: "Agendado → Ganho",       value: taxaAgendadoGanho },
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
      {kpis.top_sdrs_by_meetings?.length > 0 && (
        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-yellow-500/20 p-2">
                <Trophy size={16} className="text-yellow-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ranking SDR · Reuniões Agendadas · {periodLabel}
              </h3>
              <div className="group relative flex">
                <Info size={13} className="cursor-help text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-6 z-50 w-72 rounded-lg border border-gray-200 bg-white p-2.5 text-left text-[11px] leading-relaxed text-slate-600 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Conta as reuniões agendadas no período <b>descontando os no-shows que ainda não foram remarcados</b>. Por isso pode ficar um pouco menor que o KPI "Reuniões Agendadas" (que conta todas, inclusive um no-show sem remarcação). Reuniões <b>remarcadas continuam contando</b>.
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {kpis.top_sdrs_by_meetings.map((sdr, i) => {
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
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{sdr.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-500">{sdr.meetings_scheduled}</p>
                      <p className="text-xs text-slate-400">reuniões agendadas</p>
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
            <p className="text-3xl font-bold text-orange-400">{kpis.leads_sem_contato}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nenhuma atividade registrada</p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={16} className="text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-500">Parados +3 dias</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{kpis.cards_parados}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sem movimentação de etapa</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardSDR;
