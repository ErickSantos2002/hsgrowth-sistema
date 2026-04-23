import React from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Target, Clock,
  AlertTriangle, Trophy, Medal, Award, Percent, Ticket,
  CalendarCheck, Users, Activity, Network,
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
const CHANNEL_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#06b6d4", "#f43f5e"];
const ACTIVITY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const DashboardVendedor: React.FC<DashboardVendedorProps> = ({ kpis, periodLabel }) => {
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const ticketMedio =
    kpis.won_cards_this_month > 0
      ? kpis.won_value_this_month / kpis.won_cards_this_month
      : 0;

  const getStageCount = (listId: number) =>
    kpis.cards_by_stage?.find((s) => s.list_id === listId)?.card_count ?? 0;

  const reuniaoCount    = getStageCount(28);
  const qualificacao    = getStageCount(29);
  const proposta        = getStageCount(30);
  const negocioGanho    = getStageCount(32);

  const calcRate = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : null;

  const taxaReuniaoQualif  = calcRate(qualificacao, reuniaoCount);
  const taxaQualifProposta = calcRate(proposta, qualificacao);
  const taxaPropostaGanho  = calcRate(negocioGanho, proposta);
  const taxaGeralFunil     = calcRate(negocioGanho, reuniaoCount);

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
            label="Pipeline Gerado"
            value={kpis.pipeline_value}
            format="currency"
            highlight="green"
            sub="Valor em aberto no período"
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
            value={kpis.meetings_received_from_sdr}
            format="number"
            highlight="green"
            sub="Agendadas por SDR no período"
          />
          <KpiCard
            icon={<Target size={18} className="text-yellow-400" />}
            iconBg="bg-yellow-500/20"
            label="Propostas Geradas"
            value={kpis.propostas_geradas}
            format="number"
            highlight="orange"
            sub="Cards em Diagnóstico e Proposta"
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
            {funnelData.length > 0 && (
              <span className="ml-auto rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                {funnelData.reduce((sum, s) => sum + s.value, 0)} cards
              </span>
            )}
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

      {/* ── 3. ATIVIDADES E CANAIS ────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Atividades no Período */}
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
                  name:
                    a.type === "call" ? "Ligação" :
                    a.type === "meeting" ? "Reunião" :
                    a.type === "follow_up" ? "Follow-up" :
                    a.type === "task" ? "Tarefa" :
                    a.type === "whatsapp" ? "WhatsApp" :
                    a.type === "email" ? "E-mail" :
                    a.type === "linkedin" ? "LinkedIn" :
                    a.type,
                  count: a.count,
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
                    <Cell key={index} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem atividades no período</div>
          )}
        </div>

        {/* Cards por Canal */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/20 p-2">
                <Network size={16} className="text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Cards por Canal
              </h3>
            </div>
            {(kpis.cards_by_channel?.length ?? 0) > 0 && (
              <span className="ml-auto rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
                {kpis.cards_by_channel.reduce((sum, c) => sum + c.count, 0)} cards
              </span>
            )}
          </div>
          {(kpis.cards_by_channel?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={kpis.cards_by_channel.map((c) => ({ name: c.channel, count: c.count }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.surface.elevated, border: `1px solid ${chartColors.border.default}`, borderRadius: 8, fontSize: 12, color: darkMode ? "#ffffff" : "#0f172a" }}
                  labelStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  itemStyle={{ color: darkMode ? "#ffffff" : "#0f172a" }}
                  formatter={(v: number) => [v, "Cards"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {kpis.cards_by_channel.map((_, index) => (
                    <Cell key={index} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados de canal no período</div>
          )}
        </div>
      </section>

      {/* ── 4. CONVERSÃO ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Funil de Conversão
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { label: "Reunião → Qualificação", value: taxaReuniaoQualif },
            { label: "Qualificação → Proposta", value: taxaQualifProposta },
            { label: "Proposta → Ganho",        value: taxaPropostaGanho },
            { label: "Taxa Geral do Funil",     value: taxaGeralFunil },
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
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Pipeline Total (R$)</p>
            <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">??</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Pipeline vs Meta (%)</p>
            <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">??</p>
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
            <p className="text-3xl font-bold text-orange-400">{kpis.negocios_parados_7d}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sem movimentação de etapa</p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target size={16} className="text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-500">Propostas em Aberto</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{kpis.propostas_em_aberto}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cards ativos em Diagnóstico e Proposta</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardVendedor;
