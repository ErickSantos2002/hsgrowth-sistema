import React, { useEffect, useState } from "react";
import {
  Briefcase, CheckCircle2, XCircle, DollarSign, Activity as ActivityIcon,
  AlarmClock, TrendingUp, Wrench, Trophy, Phone, CheckSquare, Clock, Mail,
  MessageCircle, Users, Linkedin, MoreHorizontal,
} from "lucide-react";
import serviceDashboardService, { ServiceDashboard as ServiceDashboardData } from "../../services/serviceDashboardService";
import { LoadingSpinner } from "../common";

interface Props {
  period: string;
  customStart?: string;
  customEnd?: string;
  periodLabel?: string;
}

const fmtMoney = (v: number) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const periodRange = (period: string, cs?: string, ce?: string): { start?: string; end?: string } => {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
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

const TYPE_ICON: Record<string, React.ReactNode> = {
  "Ligação": <Phone size={14} className="text-blue-400" />,
  "Tarefa": <CheckSquare size={14} className="text-green-400" />,
  "Follow-up": <Clock size={14} className="text-yellow-400" />,
  "E-mail": <Mail size={14} className="text-orange-400" />,
  "WhatsApp": <MessageCircle size={14} className="text-emerald-400" />,
  "Reunião": <Users size={14} className="text-sky-400" />,
  "LinkedIn": <Linkedin size={14} className="text-sky-400" />,
  "Outro": <MoreHorizontal size={14} className="text-slate-400" />,
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }> = ({ icon, label, value, sub, accent }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/40">
    <div className="flex items-start justify-between">
      <div className={`rounded-lg p-2 ${accent || "bg-violet-500/15 text-violet-400"}`}>{icon}</div>
      <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
    {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
  </div>
);

const BarRow: React.FC<{ label: React.ReactNode; count: number; max: number; color?: string }> = ({ label, count, max, color }) => (
  <div className="flex items-center gap-3">
    <div className="flex w-40 flex-shrink-0 items-center gap-1.5 truncate text-sm text-slate-600 dark:text-slate-300">{label}</div>
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700/40">
      <div className={`h-full rounded-full ${color || "bg-violet-500"}`} style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }} />
    </div>
    <span className="w-10 flex-shrink-0 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{count}</span>
  </div>
);

const ServiceDashboard: React.FC<Props> = ({ period, customStart, customEnd, periodLabel }) => {
  const [data, setData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { start, end } = periodRange(period, customStart, customEnd);
        setData(await serviceDashboardService.get(start, end));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, customStart, customEnd]);

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!data) {
    return <p className="py-20 text-center text-slate-400">Não foi possível carregar a dashboard de serviços.</p>;
  }

  const maxStage = Math.max(1, ...data.cards_by_stage.map((s) => s.count));
  const maxType = Math.max(1, ...data.activities_by_type.map((t) => t.count));
  const maxCollab = Math.max(1, ...data.collaborators.map((c) => c.activities));

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-wide text-slate-400">Visão geral · {periodLabel || "Período"}</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard icon={<Briefcase size={18} />} label="Negócios ativos" value={String(data.active_count)} accent="bg-violet-500/15 text-violet-400" />
        <KpiCard icon={<DollarSign size={18} />} label="Pipeline (em aberto)" value={fmtMoney(data.pipeline_value)} accent="bg-emerald-500/15 text-emerald-400" />
        <KpiCard icon={<CheckCircle2 size={18} />} label="Ganhos no período" value={String(data.won_count)} sub={fmtMoney(data.won_value)} accent="bg-green-500/15 text-green-400" />
        <KpiCard icon={<XCircle size={18} />} label="Perdidos no período" value={String(data.lost_count)} accent="bg-red-500/15 text-red-400" />
        <KpiCard icon={<ActivityIcon size={18} />} label="Atividades no período" value={String(data.activities_count)} accent="bg-blue-500/15 text-blue-400" />
        <KpiCard icon={<AlarmClock size={18} />} label="Parados 3d+" value={String(data.stuck_count)} accent="bg-amber-500/15 text-amber-400" />
        <KpiCard icon={<TrendingUp size={18} />} label="Taxa de ganho" value={`${data.win_rate}%`} accent="bg-emerald-500/15 text-emerald-400" />
        <KpiCard icon={<DollarSign size={18} />} label="Ticket médio" value={fmtMoney(data.avg_ticket)} accent="bg-sky-500/15 text-sky-400" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funil */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/40">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Wrench size={18} className="text-violet-400" /> Funil de serviços</h3>
          {data.cards_by_stage.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sem dados</p>
          ) : (
            <div className="space-y-2.5">
              {data.cards_by_stage.map((s) => (
                <BarRow key={s.stage_name} label={<span className="truncate">{s.stage_name}</span>} count={s.count} max={maxStage} color="bg-violet-500" />
              ))}
            </div>
          )}
        </div>

        {/* Atividades por tipo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/40">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><ActivityIcon size={18} className="text-blue-400" /> Atividades por tipo</h3>
          {data.activities_by_type.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhuma atividade no período</p>
          ) : (
            <div className="space-y-2.5">
              {data.activities_by_type.map((t) => (
                <BarRow key={t.name} label={<>{TYPE_ICON[t.name] || <ActivityIcon size={14} />} <span className="truncate">{t.name}</span></>} count={t.count} max={maxType} color="bg-blue-500" />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ranking colaboradores */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/40">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Trophy size={18} className="text-amber-400" /> Ranking de colaboradores</h3>
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
                      <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${(c.activities / maxCollab) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400"><b className="text-slate-700 dark:text-slate-200">{c.activities}</b> ativ.</span>
                    <span className="text-green-500"><b>{c.won}</b> ✓</span>
                    <span className="text-red-400"><b>{c.lost}</b> ✗</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Motivos de perda */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/40">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><XCircle size={18} className="text-red-400" /> Motivos de perda</h3>
          {data.loss_reasons.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhuma perda no período</p>
          ) : (
            <div className="space-y-2.5">
              {data.loss_reasons.map((r) => (
                <BarRow key={r.name} label={<span className="truncate">{r.name}</span>} count={r.count} max={Math.max(1, ...data.loss_reasons.map((x) => x.count))} color="bg-red-500" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDashboard;
