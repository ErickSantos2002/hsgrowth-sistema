import React, { useEffect, useState } from "react";
import {
  Briefcase, CheckCircle2, XCircle, DollarSign, Activity as ActivityIcon,
  AlarmClock, TrendingUp, Wrench, Trophy,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import serviceDashboardService, { ServiceDashboard as ServiceDashboardData } from "../../services/serviceDashboardService";
import { LoadingSpinner } from "../common";
import { getChartColors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import KpiCard from "./KpiCard";

interface Props {
  period: string;
  customStart?: string;
  customEnd?: string;
  periodLabel?: string;
  board?: number; // 1 = funil oficial (padrão), 2 = Cobrança
  userId?: number;         // filtro de usuário (controlado no topo, no Dashboard.tsx)
  collectionType?: string; // [Cobrança] tipo de cobrança: "a_vencer" | "atrasados"
}

const ACTIVITY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#94a3b8"];

// Cor da barra por etapa do funil (Ganho = verde, Perdido = vermelho, resto = violeta)
const stageColor = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("ganho")) return "#10b981";
  if (n.includes("perdido")) return "#ef4444";
  return "#8b5cf6";
};

// KPI compacto: composição por Tipo de serviço (Recalibração/Manutenção/Ambos com %)
const ST_DOT: Record<string, string> = {
  "Recalibração": "bg-emerald-500", "Manutenção": "bg-orange-500", "Ambos": "bg-violet-500",
};
const ServiceTypeKpi: React.FC<{ items: { name: string; count: number }[] }> = ({ items }) => {
  const total = items.reduce((s, x) => s + x.count, 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-emerald-500/20 p-2"><Wrench size={16} className="text-emerald-400" /></div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de serviço</p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-slate-400">Sem dados</p>
      ) : (
        <div className="space-y-1.5">
          {["Recalibração", "Manutenção", "Ambos"].map((name) => {
            const cnt = items.find((x) => x.name === name)?.count || 0;
            const pct = Math.round((cnt / total) * 100);
            return (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${ST_DOT[name]}`} /> {name}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const fmtMoney = (v: number) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const periodRange = (period: string, cs?: string, ce?: string): { start?: string; end?: string } => {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 19);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (period) {
    case "today": return { start: iso(startOfDay(now)), end: iso(now) };
    case "yesterday": { const y = startOfDay(now); y.setDate(y.getDate() - 1); const e = new Date(y); e.setHours(23, 59, 59); return { start: iso(y), end: iso(e) }; }
    case "week": { const w = startOfDay(now); w.setDate(w.getDate() - 7); return { start: iso(w), end: iso(now) }; }
    case "month": return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); return { start: iso(s), end: iso(e) }; }
    case "quarter": { const q = Math.floor(now.getMonth() / 3) * 3; return { start: iso(new Date(now.getFullYear(), q, 1)), end: iso(now) }; }
    case "year": return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) };
    case "custom": return cs && ce ? { start: `${cs}T00:00:00`, end: `${ce}T23:59:59` } : {};
    default: return {};
  }
};

const ChartCard: React.FC<{ icon: React.ReactNode; iconBg: string; title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ icon, iconBg, title, right, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
    <div className="mb-4 flex items-center gap-2">
      <div className={`rounded-lg ${iconBg} p-2`}>{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {right && <div className="ml-auto">{right}</div>}
    </div>
    {children}
  </div>
);

const ServiceDashboard: React.FC<Props> = ({ period, customStart, customEnd, periodLabel, board, userId, collectionType }) => {
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);
  const [data, setData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Funil: "atual" = snapshot (o que está em cada etapa hoje) · "fluxo" = o que
  // entrou em cada etapa no período filtrado.
  const [funnelMode, setFunnelMode] = useState<"atual" | "fluxo">("atual");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { start, end } = periodRange(period, customStart, customEnd);
        setData(await serviceDashboardService.get(start, end, board, userId, collectionType));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, customStart, customEnd, board, userId, collectionType]);

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!data) {
    return <p className="py-20 text-center text-slate-400">Não foi possível carregar a dashboard de serviços.</p>;
  }

  const maxCollab = Math.max(1, ...data.collaborators.map((c) => c.activities + c.recalibrations));
  const funnelData = funnelMode === "fluxo" ? data.cards_by_stage_flow : data.cards_by_stage;

  const tooltipStyle = {
    contentStyle: { backgroundColor: chartColors.surface.elevated, border: `1px solid ${chartColors.border.default}`, borderRadius: 8, fontSize: 12, color: darkMode ? "#ffffff" : "#0f172a" },
    labelStyle: { color: darkMode ? "#ffffff" : "#0f172a" },
    itemStyle: { color: darkMode ? "#ffffff" : "#0f172a" },
  };

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-wide text-slate-400">Visão geral · {periodLabel || "Período"}</p>

      {/* ── KPIs (5 em cima · 4 embaixo, cada linha de canto a canto) ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={<Briefcase size={18} className="text-violet-400" />} iconBg="bg-violet-500/20" label="Negócios ativos" value={data.active_count} sub="Em aberto no pipeline" highlight="purple" />
          <KpiCard icon={<DollarSign size={18} className="text-emerald-400" />} iconBg="bg-emerald-500/20" label="Pipeline (em aberto)" value={data.pipeline_value} format="currency" sub="Valor em aberto no período" highlight="green" />
          <KpiCard icon={<CheckCircle2 size={18} className="text-green-400" />} iconBg="bg-green-500/20" label="Ganhos no período" value={data.won_count} sub={`${fmtMoney(data.won_value)} em receita`} highlight="green" />
          <KpiCard icon={<XCircle size={18} className="text-red-400" />} iconBg="bg-red-500/20" label="Perdidos no período" value={data.lost_count} sub="Negócios perdidos no período" highlight="red" />
          <KpiCard icon={<ActivityIcon size={18} className="text-blue-400" />} iconBg="bg-blue-500/20" label="Atividades no período" value={data.activities_count} sub="Registradas no período" highlight="blue" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={<AlarmClock size={18} className="text-amber-400" />} iconBg="bg-amber-500/20" label="Atrasados 3d+" value={data.stuck_count} sub="Atividade vencida há 3+ dias" highlight="orange" />
          <KpiCard icon={<TrendingUp size={18} className="text-emerald-400" />} iconBg="bg-emerald-500/20" label="Taxa de ganho" value={data.win_rate} format="percent" sub="Ganhos sobre fechados" highlight="green" />
          <KpiCard icon={<DollarSign size={18} className="text-sky-400" />} iconBg="bg-sky-500/20" label="Ticket médio" value={data.avg_ticket} format="currency" sub="Valor médio por negócio ganho" highlight="blue" />
          <ServiceTypeKpi items={data.service_type} />
        </div>
      </div>

      {/* ── Gráficos: Evolução + Funil ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard icon={<TrendingUp size={16} className="text-violet-400" />} iconBg="bg-violet-500/20" title="Evolução de Serviços">
          {data.evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="period" tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name === "won" ? "Ganhos" : name === "lost" ? "Perdidos" : "Atividades"]} />
                <Legend formatter={(value) => (value === "won" ? "Ganhos" : value === "lost" ? "Perdidos" : "Atividades")} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="activities" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="activities" />
                <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} name="won" />
                <Line type="monotone" dataKey="lost" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="lost" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard
          icon={<Wrench size={16} className="text-violet-400" />}
          iconBg="bg-violet-500/20"
          title="Funil de serviços"
          right={
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md border border-gray-200 text-[11px] dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setFunnelMode("atual")}
                  className={`px-2 py-0.5 transition-colors ${funnelMode === "atual" ? "bg-violet-500 text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  title="O que está em cada etapa hoje"
                >
                  Atual
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelMode("fluxo")}
                  className={`px-2 py-0.5 transition-colors ${funnelMode === "fluxo" ? "bg-violet-500 text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  title="Quantos entraram em cada etapa no período"
                >
                  Fluxo
                </button>
              </div>
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                {funnelData.reduce((s, x) => s + x.count, 0)} cards
              </span>
            </div>
          }
        >
          {funnelData.length === 0 || funnelData.every((s) => s.count === 0) ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {funnelMode === "fluxo" ? "Nenhum card entrou nas etapas no período" : "Sem dados"}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="stage_name" tick={{ fill: chartColors.content.secondary, fontSize: 9 }} angle={-35} textAnchor="end" height={70} interval={0} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, funnelMode === "fluxo" ? "Entraram no período" : "Cards"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnelData.map((s, i) => (
                    <Cell key={i} fill={stageColor(s.stage_name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Gráficos: Atividades por tipo + Motivos de perda ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard icon={<ActivityIcon size={16} className="text-blue-400" />} iconBg="bg-blue-500/20" title="Atividades por tipo">
          {data.activities_by_type.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhuma atividade no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.activities_by_type} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartColors.content.secondary, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Atividades"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.activities_by_type.map((_, i) => (
                    <Cell key={i} fill={ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard icon={<XCircle size={16} className="text-red-400" />} iconBg="bg-red-500/20" title="Motivos de perda">
          {data.loss_reasons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhuma perda no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.loss_reasons} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: chartColors.content.secondary, fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tickLine={false}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                />
                <YAxis tick={{ fill: chartColors.content.secondary, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Perdas"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Ranking de colaboradores ── */}
      <ChartCard icon={<Trophy size={16} className="text-amber-400" />} iconBg="bg-amber-500/20" title="Ranking de colaboradores">
        {data.collaborators.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma atividade no período</p>
        ) : (
          <div className="space-y-2">
            {data.collaborators.map((c, i) => (
              <div key={c.user_id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 dark:border-slate-700/40 dark:bg-slate-900/30">
                <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-400">
                  {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <div className="mt-0.5 flex flex-1 items-center gap-1 overflow-hidden rounded-full">
                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${((c.activities + c.recalibrations) / maxCollab) * 100}%` }} />
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400" title="Atividades realizadas">
                    <ActivityIcon size={13} className="text-blue-400" /> <b className="text-slate-700 dark:text-slate-200">{c.activities}</b>
                  </span>
                  <span className="flex items-center gap-1 text-violet-500 dark:text-violet-400" title="Recalibrações concluídas">
                    <Wrench size={13} /> <b>{c.recalibrations}</b>
                  </span>
                  <span className="flex items-center gap-1 text-green-500" title="Negócios ganhos">
                    <CheckCircle2 size={13} /> <b>{c.won}</b>
                  </span>
                  <span className="flex items-center gap-1 text-red-400" title="Negócios perdidos">
                    <XCircle size={13} /> <b>{c.lost}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default ServiceDashboard;
