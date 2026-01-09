import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  RefreshCw,
  Download,
  Calendar,
  Trophy,
  Award,
  Medal,
} from "lucide-react";
// Recharts (removido pois não está sendo usado no momento)
// import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { reportService } from "../services";
import { DashboardKPIs } from "../types";
import toast from "react-hot-toast";

// Tipo para o período selecionado
type PeriodType = "today" | "week" | "month" | "quarter" | "year";

const Dashboard: React.FC = () => {
  // Estados
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [period, setPeriod] = useState<PeriodType>("month");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Busca os dados do dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // DEBUG: Testar endpoints básicos
      console.log("🔍 Testando conexão com o banco...");

      // Importar outros services para teste
      const { boardService, cardService } = await import("../services");

      // Testar boards
      try {
        const boards = await boardService.list();
        console.log("✅ Boards encontrados:", boards);
      } catch (err) {
        console.error("❌ Erro ao buscar boards:", err);
      }

      // Testar cards
      try {
        const cards = await cardService.list({ page: 1, size: 10 });
        console.log("✅ Cards encontrados:", cards);
      } catch (err) {
        console.error("❌ Erro ao buscar cards:", err);
      }

      // Buscar KPIs normalmente
      const data = await reportService.getDashboardKPIs(period);
      console.log("📊 KPIs retornados:", data);
      setKpis(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("❌ Erro ao buscar dados do dashboard:", err);
      setError(err?.response?.data?.detail || "Erro ao carregar dashboard");
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados ao montar e quando o período muda
  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  // Handler para refresh manual
  const handleRefresh = () => {
    toast.success("Atualizando dados...");
    fetchDashboardData();
  };

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
      doc.text(`Período: ${periodLabel} | Gerado em: ${lastUpdate.toLocaleString("pt-BR")}`, pageWidth / 2, 28, { align: "center" });

      // KPIs principais
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Indicadores Principais", 14, 40);

      const kpisData = [
        ["Total de Cards", kpis.total_cards.toString()],
        ["Novos Este Mês", kpis.new_cards_this_month.toString()],
        ["Cards Ganhos Este Mês", kpis.won_cards_this_month.toString()],
        ["Cards Perdidos Este Mês", kpis.lost_cards_this_month.toString()],
        ["Cards Vencidos", kpis.overdue_cards.toString()],
        ["Valor em Pipeline", formatCurrency(kpis.pipeline_value)],
        ["Valor Ganho Este Mês", formatCurrency(kpis.won_value_this_month)],
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
        ["Total de Cards", kpis.total_cards],
        ["Novos Este Mês", kpis.new_cards_this_month],
        ["Cards Ganhos Este Mês", kpis.won_cards_this_month],
        ["Cards Perdidos Este Mês", kpis.lost_cards_this_month],
        ["Cards Vencidos", kpis.overdue_cards],
        ["Valor em Pipeline", kpis.pipeline_value],
        ["Valor Ganho Este Mês", kpis.won_value_this_month],
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
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-slate-700/50 rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-10 w-32 bg-slate-700/50 rounded animate-pulse" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-80 animate-pulse" />
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  // Renderiza erro
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">
            Erro ao carregar dashboard
          </div>
          <div className="text-slate-400 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Renderiza dashboard com dados
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Filtro de Período */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="appearance-none bg-slate-800/80 border border-slate-700/50 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Botão Refresh */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-white rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Botão Exportar */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-lg transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            {/* Dropdown de exportação */}
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2 hover:bg-slate-700 text-white rounded-t-lg transition-colors"
              >
                Exportar PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2 hover:bg-slate-700 text-white rounded-b-lg transition-colors"
              >
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card: Total de Cards */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total de Cards</div>
              <div className="text-3xl font-bold text-white">
                {kpis?.total_cards || 0}
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
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Valor em Pipeline</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(kpis?.pipeline_value || 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Cards ativos
          </div>
        </div>

        {/* Card: Valor Ganho */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Ganho Este Mês</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(kpis?.won_value_this_month || 0)}
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
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Taxa de Conversão</div>
              <div className="text-3xl font-bold text-white">
                {formatPercentage(kpis?.conversion_rate_this_month || 0)}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Novos Este Mês */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Novos Este Mês</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {kpis?.new_cards_this_month || 0}
          </div>
          <div className="text-sm text-slate-400">
            {kpis?.new_cards_this_week || 0} esta semana • {kpis?.new_cards_today || 0} hoje
          </div>
        </div>

        {/* Card: Cards Vencidos */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Cards Vencidos</h3>
          </div>
          <div className="text-3xl font-bold text-red-400 mb-2">
            {kpis?.overdue_cards || 0}
          </div>
          <div className="text-sm text-slate-400">
            {kpis?.due_today || 0} vencem hoje • {kpis?.due_this_week || 0} esta semana
          </div>
        </div>

        {/* Card: Tempo Médio */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Tempo Médio</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {kpis?.avg_time_to_win_days ? `${kpis.avg_time_to_win_days.toFixed(1)} dias` : "N/A"}
          </div>
          <div className="text-sm text-slate-400">
            Para ganhar um deal
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Top Performers</h3>
        </div>

        {kpis && kpis.top_sellers_this_month && kpis.top_sellers_this_month.length > 0 ? (
          <div className="space-y-3">
            {kpis.top_sellers_this_month.slice(0, 5).map((seller, index) => {
              // Define ícone e cor por posição
              let badgeIcon = null;
              let badgeColor = "";

              if (index === 0) {
                badgeIcon = <Trophy className="w-5 h-5" />;
                badgeColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
              } else if (index === 1) {
                badgeIcon = <Medal className="w-5 h-5" />;
                badgeColor = "text-slate-300 bg-slate-500/10 border-slate-500/30";
              } else if (index === 2) {
                badgeIcon = <Award className="w-5 h-5" />;
                badgeColor = "text-orange-400 bg-orange-500/10 border-orange-500/30";
              } else {
                badgeColor = "text-slate-400 bg-slate-700/30 border-slate-600/30";
              }

              return (
                <div
                  key={`seller-${index}`}
                  className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Posição/Badge */}
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border ${badgeColor}`}
                    >
                      {badgeIcon ? badgeIcon : <span className="font-bold">#{index + 1}</span>}
                    </div>

                    {/* Nome */}
                    <div>
                      <div className="text-white font-medium">
                        {seller.name || "Sem nome"}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {seller.cards_won} deals fechados
                      </div>
                    </div>
                  </div>

                  {/* Valor Ganho */}
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      {formatCurrency(seller.total_value)}
                    </div>
                    <div className="text-slate-500 text-xs">Valor Total</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p>Nenhum dado de performance disponível</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
