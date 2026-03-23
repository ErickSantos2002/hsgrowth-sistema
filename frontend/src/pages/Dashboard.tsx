import React, { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  LayoutDashboard,
  RefreshCw,
  Download,
  Calendar,
  ChevronDown,
  Trophy,
  Award,
  Medal,
} from "lucide-react";
// Recharts para gráficos
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import CountUp from "react-countup";
import toast from "react-hot-toast";
import { useDashboard, PeriodType } from "../context/DashboardContext";
import { COLORS, getChartColors } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import userService from "../services/userService";
import { User } from "../types";

const Dashboard: React.FC = () => {
  // Usa o contexto do Dashboard
  const { kpis, loading, error, period, lastUpdate, selectedUserId, setSelectedUserId, fetchDashboardData, handleRefresh, setPeriod } = useDashboard();
  // Cores dos graficos adaptadas ao tema atual (Recharts nao suporta dark: do Tailwind)
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);
  const { user } = useAuth();

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isRestrictedRole = user?.role === "salesperson" || user?.role === "sdr";

  const periodLabel: Record<string, string> = {
    today: "Hoje",
    week: "Esta Semana",
    month: "Este Mês",
    quarter: "Este Trimestre",
    year: "Este Ano",
  };

  // Lista de usuários ativos para o seletor (apenas admin/manager)
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  useEffect(() => {
    if (isAdminOrManager) {
      userService.listActive().then(setActiveUsers).catch(() => {});
    }
  }, [isAdminOrManager]);

  // Quando selectedUserId muda pelo seletor (não no mount), recarrega os dados
  const userIdMountedRef = useRef(false);
  useEffect(() => {
    if (!userIdMountedRef.current) {
      userIdMountedRef.current = true;
      return;
    }
    fetchDashboardData();
  }, [selectedUserId]);

  // Carrega dados apenas na primeira vez que monta o componente (se não tiver em cache)
  useEffect(() => {
    if (!kpis) {
      fetchDashboardData();
    }
  }, []);

  // Handler para exportar PDF
  const handleExportPDF = () => {
    if (!kpis) {
      toast.error("Nenhum dado disponível para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Título
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Azul
      doc.text("Dashboard HSGrowth CRM", pageWidth / 2, 20, { align: "center" });

      // Subtítulo com período e data
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const periodLabel = {
        today: "Hoje",
        week: "Esta Semana",
        month: "Este Mês",
        quarter: "Este Trimestre",
        year: "Este Ano",
      }[period];
      doc.text(`Período: ${periodLabel} | Gerado em: ${lastUpdate ? lastUpdate.toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}`, pageWidth / 2, 28, { align: "center" });

      // KPIs principais
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Indicadores Principais", 14, 40);

      const kpisData = [
        [`Abertos ${periodLabel[period]}`, kpis.total_cards.toString()],
        [`Novos ${periodLabel[period]}`, kpis.new_cards_this_month.toString()],
        [`Cards Ganhos ${periodLabel[period]}`, kpis.won_cards_this_month.toString()],
        [`Cards Perdidos ${periodLabel[period]}`, kpis.lost_cards_this_month.toString()],
        ["Cards Vencidos", kpis.overdue_cards.toString()],
        ["Valor em Pipeline", formatCurrency(kpis.pipeline_value)],
        [`Valor Ganho ${periodLabel[period]}`, formatCurrency(kpis.won_value_this_month)],
        ["Taxa de Conversão", formatPercentage(kpis.conversion_rate_this_month)],
        ["Ticket Médio", formatCurrency(
          kpis.won_cards_this_month > 0
            ? kpis.won_value_this_month / kpis.won_cards_this_month
            : 0
        )],
        ["Tempo Médio para Ganhar", kpis.avg_time_to_win_days ? `${kpis.avg_time_to_win_days.toFixed(1)} dias` : "N/A"],
      ];

      autoTable(doc, {
        startY: 45,
        head: [["Indicador", "Valor"]],
        body: kpisData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Top Performers
      if (kpis.top_sellers_this_month && kpis.top_sellers_this_month.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 100;

        doc.setFontSize(14);
        doc.text("Top Performers", 14, finalY + 15);

        const performersData = kpis.top_sellers_this_month.slice(0, 5).map((seller, idx) => [
          `${idx + 1}º`,
          seller.name,
          seller.cards_won.toString(),
          formatCurrency(seller.total_value),
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [["Posição", "Nome", "Deals Fechados", "Valor Total"]],
          body: performersData,
          theme: "grid",
          headStyles: { fillColor: [234, 179, 8] }, // Amarelo
        });
      }

      // Rodapé
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      // Salva o PDF
      doc.save(`dashboard-hsgrowth-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  // Handler para exportar Excel
  const handleExportExcel = () => {
    if (!kpis) {
      toast.error("Nenhum dado disponível para exportar");
      return;
    }

    try {
      // Cria workbook
      const wb = XLSX.utils.book_new();

      // Aba 1: KPIs Principais
      const kpisData = [
        ["Indicador", "Valor"],
        [`Abertos ${periodLabel[period]}`, kpis.total_cards],
        [`Novos ${periodLabel[period]}`, kpis.new_cards_this_month],
        [`Cards Ganhos ${periodLabel[period]}`, kpis.won_cards_this_month],
        [`Cards Perdidos ${periodLabel[period]}`, kpis.lost_cards_this_month],
        ["Cards Vencidos", kpis.overdue_cards],
        ["Valor em Pipeline", kpis.pipeline_value],
        [`Valor Ganho ${periodLabel[period]}`, kpis.won_value_this_month],
        ["Taxa de Conversão (%)", kpis.conversion_rate_this_month],
        ["Ticket Médio", kpis.won_cards_this_month > 0 ? kpis.won_value_this_month / kpis.won_cards_this_month : 0],
        ["Tempo Médio (dias)", kpis.avg_time_to_win_days || "N/A"],
      ];
      const wsKPIs = XLSX.utils.aoa_to_sheet(kpisData);
      XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs");

      // Aba 2: Top Performers
      if (kpis.top_sellers_this_month && kpis.top_sellers_this_month.length > 0) {
        const performersData = [
          ["Posição", "Nome", "Deals Fechados", "Valor Total"],
          ...kpis.top_sellers_this_month.slice(0, 5).map((seller, idx) => [
            idx + 1,
            seller.name,
            seller.cards_won,
            seller.total_value,
          ]),
        ];
        const wsPerformers = XLSX.utils.aoa_to_sheet(performersData);
        XLSX.utils.book_append_sheet(wb, wsPerformers, "Top Performers");
      }

      // Gera arquivo
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `dashboard-hsgrowth-${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    }
  };

  // Formata valor em moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Formata percentual
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Renderiza loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 overflow-x-hidden p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700/50" />
          <div className="flex gap-3">
            <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-slate-700/50" />
            <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-slate-700/50" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl"
            />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl" />
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl" />
        </div>
      </div>
    );
  }

  // Renderiza erro
  if (error) {
    return (
      <div className="overflow-x-hidden p-6">
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-center">
          <div className="mb-2 text-lg font-semibold text-red-400">
            Erro ao carregar dashboard
          </div>
          <div className="mb-4 text-slate-400">{error}</div>
          <button
            onClick={handleRefresh}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Renderiza dashboard com dados
  return (
    <div className="space-y-6 overflow-x-hidden p-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-left">
          <h1 className="mb-1 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <LayoutDashboard className="text-slate-900 dark:text-white" size={32} />
            Dashboard
          </h1>
          {isRestrictedRole && (
            <p className="text-sm font-medium text-emerald-500">
              Meu Dashboard — {user?.name}
            </p>
          )}
          {isAdminOrManager && selectedUserId && (
            <p className="text-sm font-medium text-emerald-500">
              Visualizando: {activeUsers.find((u) => u.id === selectedUserId)?.name ?? ""}
            </p>
          )}
          <p className="text-sm text-slate-400">
            Última atualização: {lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR") : "Carregando..."}
          </p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-3 sm:w-auto sm:justify-start">
          {/* Seletor de usuário — apenas admin/gerente */}
          {isAdminOrManager && (
            <div className="min-w-[180px]">
              <SelectMenu
                value={selectedUserId ? String(selectedUserId) : ""}
                options={[
                  { value: "", label: "Todos os usuários" },
                  ...activeUsers.map((u) => ({ value: String(u.id), label: u.name })),
                ]}
                placeholder="Todos os usuários"
                onChange={(val) => setSelectedUserId(val ? Number(val) : null)}
                icon={<Users className="h-4 w-4 text-slate-400" />}
              />
            </div>
          )}

          {/* Filtro de Período */}
          <div className="min-w-[180px]">
            <SelectMenu
              value={period}
              options={[
                { value: "today", label: "Hoje" },
                { value: "week", label: "Esta Semana" },
                { value: "month", label: "Este Mês" },
                { value: "quarter", label: "Este Trimestre" },
                { value: "year", label: "Este Ano" },
              ]}
              onChange={(value) => setPeriod(value as PeriodType)}
              icon={<Calendar className="h-4 w-4 text-slate-400" />}
            />
          </div>

          {/* Botão Refresh */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-700/80"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Botão Exportar */}
          <div className="group relative">
            <button className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm text-green-400 transition-all hover:bg-green-500/30">
              <Download className="h-6 w-6 sm:h-4 sm:w-4 text-slate-900 dark:text-green-400" />
              <span className="hidden sm:inline text-slate-900 dark:text-green-400">Exportar</span>
            </button>

            {/* Dropdown de exportação */}
            <div className="invisible absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={handleExportPDF}
                className="w-full rounded-t-lg px-4 py-2 text-left text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-700"
              >
                Exportar PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full rounded-b-lg px-4 py-2 text-left text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-700"
              >
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {/* Card: Total de Cards */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl transition-all hover:border-gray-300 dark:hover:border-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-lg bg-blue-500/20 p-3">
              <Target className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Abertos no Período</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                <CountUp end={kpis?.total_cards || 0} duration={1.5} separator="." />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-400">
              {kpis?.won_cards_this_month || 0} ganhos
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-red-400">
              {kpis?.lost_cards_this_month || 0} perdidos
            </span>
          </div>
        </div>

        {/* Card: Valor Total */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl transition-all hover:border-gray-300 dark:hover:border-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-lg bg-green-500/20 p-3">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Valor em Pipeline</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                <CountUp
                  end={kpis?.pipeline_value || 0}
                  duration={1.5}
                  decimals={2}
                  decimal=","
                  separator="."
                  prefix="R$ "
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Cards ativos
          </div>
        </div>

        {/* Card: Valor Ganho */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl transition-all hover:border-gray-300 dark:hover:border-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-lg bg-purple-500/20 p-3">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Ganho {periodLabel[period]}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                <CountUp
                  end={kpis?.won_value_this_month || 0}
                  duration={1.5}
                  decimals={2}
                  decimal=","
                  separator="."
                  prefix="R$ "
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-green-400">
              {kpis?.won_cards_this_month || 0} deals fechados
            </span>
          </div>
        </div>

        {/* Card: Taxa de Conversão */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl transition-all hover:border-gray-300 dark:hover:border-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-lg bg-orange-500/20 p-3">
              <Users className="h-6 w-6 text-orange-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Taxa de Conversão</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                <CountUp
                  end={kpis?.conversion_rate_this_month || 0}
                  duration={1.5}
                  decimals={1}
                  decimal=","
                  suffix="%"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            Ticket médio: {formatCurrency(
              kpis?.won_cards_this_month && kpis.won_cards_this_month > 0
                ? kpis.won_value_this_month / kpis.won_cards_this_month
                : 0
            )}
          </div>
        </div>
      </div>

      {/* Cards Ativos e Estatísticas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card: Novos Este Mês */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Novos {periodLabel[period]}</h3>
          </div>
          <div className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            <CountUp end={kpis?.new_cards_this_month || 0} duration={1.5} separator="." />
          </div>
          <div className="text-sm text-slate-400">
            {kpis?.new_cards_this_week || 0} esta semana • {kpis?.new_cards_today || 0} hoje
          </div>
        </div>

        {/* Card: Cards Vencidos */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cards Vencidos</h3>
          </div>
          <div className="mb-2 text-3xl font-bold text-red-400">
            <CountUp end={kpis?.overdue_cards || 0} duration={1.5} separator="." />
          </div>
          <div className="text-sm text-slate-400">
            {kpis?.due_today || 0} vencem hoje • {kpis?.due_this_week || 0} esta semana
          </div>
        </div>

        {/* Card: Tempo Médio */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tempo Médio</h3>
          </div>
          <div className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            {kpis?.avg_time_to_win_days ? (
              <>
                <CountUp
                  end={kpis.avg_time_to_win_days}
                  duration={1.5}
                  decimals={1}
                  decimal=","
                />{" "}
                dias
              </>
            ) : (
              "N/A"
            )}
          </div>
          <div className="text-sm text-slate-400">
            Para ganhar um deal
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top Performers</h3>
        </div>

        {kpis && kpis.top_sellers_this_month && kpis.top_sellers_this_month.length > 0 ? (
          <div className="space-y-3">
            {kpis.top_sellers_this_month.slice(0, 5).map((seller, index) => {
              // Define ícone e cor por posição
              let badgeIcon = null;
              let badgeColor = "";

              if (index === 0) {
                badgeIcon = <Trophy className="h-5 w-5" />;
                badgeColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
              } else if (index === 1) {
                badgeIcon = <Medal className="h-5 w-5" />;
                badgeColor = "text-slate-600 bg-slate-500/10 border-slate-500/30 dark:text-slate-300";
              } else if (index === 2) {
                badgeIcon = <Award className="h-5 w-5" />;
                badgeColor = "text-orange-400 bg-orange-500/10 border-orange-500/30";
              } else {
                badgeColor = "text-slate-400 bg-slate-700/30 border-slate-600/30";
              }

              return (
                <div
                  key={`seller-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-slate-600/30 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    {/* Posição/Badge */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border ${badgeColor}`}
                    >
                      {badgeIcon ? badgeIcon : <span className="font-bold">#{index + 1}</span>}
                    </div>

                    {/* Nome */}
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {seller.name || "Sem nome"}
                      </div>
                      <div className="text-sm text-slate-400">
                        {seller.cards_won} deals fechados
                      </div>
                    </div>
                  </div>

                  {/* Valor Ganho */}
                  <div className="text-right">
                    <div className="font-semibold text-green-400">
                      {formatCurrency(seller.total_value)}
                    </div>
                    <div className="text-xs text-slate-500">Valor Total</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-slate-500">
            <Users className="mb-3 h-12 w-12 opacity-50" />
            <p>Nenhum dado de performance disponível</p>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico: Cards por Estágio */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Target className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cards por Estágio</h3>
          </div>

          {kpis && kpis.cards_by_stage && kpis.cards_by_stage.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={kpis.cards_by_stage}
                  margin={{ top: 50, right: 10, left: 0, bottom: 50 }}
                >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} />
                <XAxis
                  dataKey="stage_name"
                  stroke={chartColors.content.tertiary}
                  tick={{ fill: chartColors.content.tertiary }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke={chartColors.content.tertiary} tick={{ fill: chartColors.content.tertiary }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.surface.elevated,
                    border: `1px solid ${chartColors.border.light}`,
                    borderRadius: "0.5rem"
                  }}
                  labelStyle={{ color: chartColors.content.primary }}
                  itemStyle={{ color: COLORS.board.blue }}
                  formatter={(value: any, name: string) => {
                    if (name === "card_count") return [value, "Cards"];
                    if (name === "total_value") return [formatCurrency(value), "Valor Total"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="card_count" fill={COLORS.board.blue} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-blue-500">Quantidade de Cards</span>
              </div>
            </>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center text-slate-500">
              <Target className="mb-3 h-12 w-12 opacity-50" />
              <p>Nenhum dado de cards por estágio disponível</p>
            </div>
          )}
        </div>

        {/* Gráfico: Evolução de Vendas */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Evolução de Vendas (Últimos 6 Meses)</h3>
          </div>

          {kpis && kpis.sales_evolution && kpis.sales_evolution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={kpis.sales_evolution}
                  margin={{ top: 50, right: 10, left: 0, bottom: 40 }}
                >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} />
                <XAxis
                  dataKey="period"
                  stroke={chartColors.content.tertiary}
                  tick={{ fill: chartColors.content.tertiary }}
                />
                <YAxis stroke={chartColors.content.tertiary} tick={{ fill: chartColors.content.tertiary }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.surface.elevated,
                    border: `1px solid ${chartColors.border.light}`,
                    borderRadius: "0.5rem"
                  }}
                  labelStyle={{ color: chartColors.content.primary }}
                  formatter={(value: any, name: string) => {
                    if (name === "won_count") return [value, "Cards Ganhos"];
                    if (name === "won_value") return [formatCurrency(value), "Valor Ganho"];
                    if (name === "lost_count") return [value, "Cards Perdidos"];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                  formatter={(value: string) => {
                    if (value === "won_count") return "Cards Ganhos";
                    if (value === "won_value") return "Valor Ganho (R$)";
                    if (value === "lost_count") return "Cards Perdidos";
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="won_count"
                  stroke={COLORS.board.green}
                  strokeWidth={2}
                  dot={{ fill: COLORS.board.green, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="lost_count"
                  stroke={COLORS.board.red}
                  strokeWidth={2}
                  dot={{ fill: COLORS.board.red, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center text-slate-500">
              <TrendingUp className="mb-3 h-12 w-12 opacity-50" />
              <p>Nenhum dado de evolução de vendas disponível</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
