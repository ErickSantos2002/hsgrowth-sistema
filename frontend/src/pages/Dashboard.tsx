import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, RefreshCw, Download, Calendar,
  ChevronDown, Users, UserCheck, Briefcase,
} from "lucide-react";
import CountUp from "react-countup";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import { useDashboard, PeriodType, ViewType } from "../context/DashboardContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import userService from "../services/userService";
import { User } from "../types";

import DashboardSDR      from "../components/dashboard/DashboardSDR";
import DashboardVendedor from "../components/dashboard/DashboardVendedor";

// ─── Tipos de visão ──────────────────────────────────────────────────────────
// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// ─── Componente Principal ────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const {
    kpis, loading, error, period, customStart, customEnd,
    setCustomRange, lastUpdate, selectedUserId, setSelectedUserId,
    view, setView, fetchDashboardData, handleRefresh, setPeriod,
  } = useDashboard();

  const { darkMode } = useTheme();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isSdr         = user?.role === "sdr";
  const isSalesperson = user?.role === "salesperson";

  // Lista de usuários para o seletor (admin/manager)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  useEffect(() => {
    if (isAdminOrManager) {
      userService.listActive().then(setAllUsers).catch(() => {});
    }
  }, [isAdminOrManager]);

  // Filtra usuários pelo papel da visão selecionada
  const filteredUsers = allUsers.filter((u) =>
    view === "sdr" ? u.role === "sdr" : u.role === "salesperson"
  );

  // Rótulo do período
  const periodLabel: Record<PeriodType, string> = {
    today:     "Hoje",
    yesterday: "Ontem",
    week:      "Esta Semana",
    month:     "Este Mês",
    quarter:   "Este Trimestre",
    year:      "Este Ano",
    custom:    customStart && customEnd ? `${customStart} – ${customEnd}` : "Personalizado",
  };

  // Quando admin muda de visão, o setView do contexto já limpa o selectedUserId
  const handleViewChange = (v: ViewType) => {
    setView(v);
    fetchDashboardData(undefined, v);
  };

  // Recarrega ao trocar usuário (ignora mount)
  const userIdMountedRef = useRef(false);
  useEffect(() => {
    if (!userIdMountedRef.current) { userIdMountedRef.current = true; return; }
    fetchDashboardData();
  }, [selectedUserId]);

  useEffect(() => {
    if (!kpis) fetchDashboardData();
  }, []);

  // ── Export PDF ──────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!kpis) { toast.error("Nenhum dado disponível"); return; }
    try {
      const doc = new jsPDF();
      const w = doc.internal.pageSize.getWidth();
      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246);
      doc.text("Dashboard HSGrowth CRM", w / 2, 20, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Período: ${periodLabel[period]} | ${new Date().toLocaleString("pt-BR")}`, w / 2, 28, { align: "center" });
      autoTable(doc, {
        startY: 35,
        head: [["Indicador", "Valor"]],
        body: [
          ["Novos Leads", String(kpis.new_cards_this_month)],
          ["Ganhos", String(kpis.won_cards_this_month)],
          ["Perdidos", String(kpis.lost_cards_this_month)],
          ["Receita", fmt(kpis.won_value_this_month)],
          ["Pipeline", fmt(kpis.pipeline_value)],
          ["Taxa Conversão", `${kpis.conversion_rate_this_month.toFixed(1)}%`],
        ],
        headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save(`dashboard-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado!");
    } catch { toast.error("Erro ao exportar PDF"); }
  };

  // ── Export Excel ────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!kpis) { toast.error("Nenhum dado disponível"); return; }
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ["Indicador", "Valor"],
        ["Novos Leads", kpis.new_cards_this_month],
        ["Ganhos", kpis.won_cards_this_month],
        ["Perdidos", kpis.lost_cards_this_month],
        ["Receita", kpis.won_value_this_month],
        ["Pipeline", kpis.pipeline_value],
        ["Taxa Conversão (%)", kpis.conversion_rate_this_month],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "KPIs");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([buf], { type: "application/octet-stream" }), `dashboard-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exportado!");
    } catch { toast.error("Erro ao exportar Excel"); }
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700/50" />
          <div className="flex gap-3">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700/50" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50" />
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50" />
        </div>
      </div>
    );
  }

  // ── Erro ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="mb-2 font-semibold text-red-400">Erro ao carregar dashboard</p>
          <p className="mb-4 text-sm text-slate-400">{error}</p>
          <button onClick={handleRefresh} className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 overflow-x-hidden p-4 sm:p-6">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Título + subtítulo */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <LayoutDashboard size={26} />
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Última atualização: {lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR") : "—"}
          </p>
          {/* Quem está sendo visto */}
          {(isSdr || isSalesperson) && (
            <p className="mt-0.5 text-xs font-medium text-emerald-500">
              Meu Dashboard — {user?.name}
            </p>
          )}
          {isAdminOrManager && selectedUserId && (
            <p className="mt-0.5 text-xs font-medium text-emerald-500">
              Visualizando: {allUsers.find((u) => u.id === selectedUserId)?.name}
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">

          {/* Toggle SDR | Vendedor — apenas admin/manager */}
          {isAdminOrManager && (
            <div className="flex w-full rounded-lg border border-gray-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 sm:w-auto">
              <button
                onClick={() => handleViewChange("sdr")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all sm:flex-none ${
                  view === "sdr"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserCheck size={14} /> SDR
              </button>
              <button
                onClick={() => handleViewChange("vendedor")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all sm:flex-none ${
                  view === "vendedor"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Briefcase size={14} /> Vendedor
              </button>
            </div>
          )}

          {/* Seletor de usuário — filtrado pelo papel da visão */}
          {isAdminOrManager && filteredUsers.length > 0 && (
            <SelectMenu
              value={selectedUserId ? String(selectedUserId) : ""}
              options={[
                { value: "", label: view === "sdr" ? "Todos os SDRs" : "Todos os Vendedores" },
                ...filteredUsers.map((u) => ({ value: String(u.id), label: u.name })),
              ]}
              onChange={(val) => setSelectedUserId(val ? Number(val) : null)}
              icon={<Users size={14} className="text-slate-400" />}
              className="w-full sm:w-auto"
            />
          )}

          {/* Período */}
          <SelectMenu
            value={period}
            options={[
              { value: "today",     label: "Hoje" },
              { value: "yesterday", label: "Ontem" },
              { value: "week",      label: "Esta Semana" },
              { value: "month",     label: "Este Mês" },
              { value: "quarter",   label: "Este Trimestre" },
              { value: "year",      label: "Este Ano" },
              { value: "custom",    label: "Personalizado" },
            ]}
            onChange={(v) => setPeriod(v as PeriodType)}
            icon={<Calendar size={14} className="text-slate-400" />}
            className="w-full sm:w-auto"
          />

          {/* Datas personalizadas */}
          {period === "custom" && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <input
                type="date" value={customStart} max={customEnd || undefined}
                onChange={(e) => setCustomRange(e.target.value, customEnd)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:flex-none"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date" value={customEnd} min={customStart || undefined}
                onChange={(e) => setCustomRange(customStart, e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:flex-none"
              />
            </div>
          )}

          {/* Atualizar | Exportar */}
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <button
                onClick={handleRefresh}
                className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RefreshCw size={14} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="group relative flex-1 sm:flex-none">
              <button className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400">
                <Download size={14} />
                <span>Exportar</span>
              </button>
              <div className="invisible absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800">
                <button onClick={handleExportPDF}   className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700">Exportar PDF</button>
                <button onClick={handleExportExcel} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700">Exportar Excel</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO DA VISÃO ───────────────────────────────────────── */}
      {kpis ? (
        view === "sdr" || isSdr ? (
          <DashboardSDR kpis={kpis} periodLabel={periodLabel[period]} />
        ) : (
          <DashboardVendedor kpis={kpis} periodLabel={periodLabel[period]} />
        )
      ) : (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Nenhum dado disponível
        </div>
      )}
    </div>
  );
};

// ─── SelectMenu local ────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string; }
interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, onChange, icon, placeholder, className = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
            {selected?.label ?? placeholder ?? "Selecione"}
          </span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-full min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 ${opt.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
