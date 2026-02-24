/**
 * Página de Relatórios — Gerador de Dashboards Customizados (Power BI-style)
 *
 * Fase 2: integração completa com a API.
 *   - GET /api/v1/reports/fields  → catálogo de campos
 *   - POST /api/v1/reports/query  → dados reais do banco
 *   - CRUD /api/v1/reports/custom → persistência em PostgreSQL
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Shield,
  LayoutGrid,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout';
import { SearchInput } from '../components/common';
import { showSuccess, showError } from '../utils/toast';
import FieldPanel from '../components/reports/FieldPanel';
import ChartWidget from '../components/reports/ChartWidget';
import ChartConfigPanel from '../components/reports/ChartConfigPanel';
import NewReportModal from '../components/reports/NewReportModal';
import reportService from '../services/reportService';
import {
  DataSource,
  ChartConfig,
  QueryResponse,
  CustomReportConfig,
  SavedReport,
  FieldCatalog,
} from '../components/reports/reportTypes';

// Catálogo vazio inicial (enquanto carrega da API)
const EMPTY_CATALOG: FieldCatalog = {
  cards: [],
  clients: [],
  persons: [],
  activities: [],
};

const Reports: React.FC = () => {
  const { user: currentUser } = useAuth();

  // ========================
  // Estado principal
  // ========================

  // Modo de exibição: lista de relatórios ou builder
  const [mode, setMode] = useState<'list' | 'builder'>('list');

  // Catálogo de campos carregado da API
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalog>(EMPTY_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Lista de relatórios salvos no backend
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Relatório sendo editado no builder
  const [currentReport, setCurrentReport] = useState<CustomReportConfig>({
    name: 'Novo Relatório',
    charts: [],
    allowed_sources: [],
  });

  // Dados de cada gráfico (key = chart.id); são carregados via API
  const [chartData, setChartData] = useState<Record<string, QueryResponse>>({});

  // Fontes de dados ativas no painel esquerdo do builder
  const [activeSources, setActiveSources] = useState<DataSource[]>([]);

  // Modal de criação de novo relatório
  const [showNewReportModal, setShowNewReportModal] = useState(false);

  // Controla se o painel direito está em modo ativo (form visível) ou idle (placeholder)
  const [configPanelActive, setConfigPanelActive] = useState(false);
  // Gráfico sendo editado — null significa "novo gráfico"
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);

  // Busca na lista de relatórios
  const [searchTerm, setSearchTerm] = useState('');

  // Edição inline do título do relatório (no builder)
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState('Novo Relatório');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Permissão de acesso
  const isManagerOrAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // ========================
  // Inicialização
  // ========================

  // Carrega catálogo de campos e lista de relatórios ao montar
  useEffect(() => {
    if (!isManagerOrAdmin) return;

    const loadInitialData = async () => {
      try {
        setCatalogLoading(true);
        setReportsLoading(true);

        // Carrega em paralelo para maior performance
        const [catalog, reports] = await Promise.all([
          reportService.fetchReportFields(),
          reportService.listCustomReports(),
        ]);

        setFieldCatalog(catalog);
        setSavedReports(reports);
      } catch {
        showError('Erro ao carregar dados de relatórios');
      } finally {
        setCatalogLoading(false);
        setReportsLoading(false);
      }
    };

    loadInitialData();
  }, [isManagerOrAdmin]);

  // Foca o input de título ao entrar em modo de edição inline
  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isTitleEditing]);

  // ========================
  // Helpers: busca de dados
  // ========================

  /**
   * Busca os dados reais de um gráfico via API e atualiza chartData.
   * Silencia erros individuais de chart para não bloquear o builder.
   */
  const fetchChartData = useCallback(async (config: ChartConfig) => {
    if (!config.x_field || config.y_fields.length === 0) return;

    try {
      const data = await reportService.queryChart(config);
      setChartData((prev) => ({ ...prev, [config.id]: data }));
    } catch {
      // Mantém dados anteriores em caso de falha (não limpa o gráfico)
    }
  }, []);

  // ========================
  // Handlers: modo lista
  // ========================

  const handleNewReport = () => setShowNewReportModal(true);

  /** Recebe nome e fontes do modal e inicia o builder em branco */
  const handleCreateReport = (name: string, sources: DataSource[]) => {
    const blank: CustomReportConfig = { name, charts: [], allowed_sources: sources };
    setCurrentReport(blank);
    setChartData({});
    setTitleValue(name);
    setActiveSources(sources);
    setConfigPanelActive(false);
    setEditingChart(null);
    setShowNewReportModal(false);
    setMode('builder');
  };

  /** Abre relatório salvo no builder e carrega os dados de cada gráfico via API */
  const handleOpenReport = async (report: SavedReport) => {
    setCurrentReport(report.config);
    setTitleValue(report.config.name);
    setActiveSources(report.config.allowed_sources ?? []);
    setMode('builder');

    // Carrega dados reais de cada gráfico em paralelo
    const charts = report.config.charts.filter(
      (c) => c.x_field && c.y_fields.length > 0
    );

    const results = await Promise.allSettled(
      charts.map((chart) => reportService.queryChart(chart))
    );

    const newData: Record<string, QueryResponse> = {};
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        newData[charts[idx].id] = result.value;
      }
    });
    setChartData(newData);
  };

  /** Remove relatório do backend e da lista local */
  const handleDeleteReport = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    try {
      await reportService.deleteCustomReport(id);
      setSavedReports((prev) => prev.filter((r) => r.id !== id));
      showSuccess('Relatório excluído com sucesso!');
    } catch {
      showError('Erro ao excluir relatório');
    }
  };

  // ========================
  // Handlers: builder
  // ========================

  /** Salva relatório atual no backend (cria novo ou atualiza existente) */
  const handleSaveReport = async () => {
    try {
      const reportName = titleValue.trim() || 'Sem título';
      const configToSave: CustomReportConfig = { ...currentReport, name: reportName };

      if (currentReport.id) {
        // Atualiza relatório existente
        const updated = await reportService.updateCustomReport(currentReport.id, configToSave);
        setSavedReports((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        showSuccess('Relatório atualizado com sucesso!');
      } else {
        // Cria novo relatório
        const created = await reportService.createCustomReport(configToSave);
        // Guarda o id no estado para que saves futuros atualizem o mesmo registro
        setCurrentReport((prev) => ({ ...prev, name: reportName, id: created.id }));
        setSavedReports((prev) => [created, ...prev]);
        showSuccess('Relatório salvo com sucesso!');
      }
    } catch {
      showError('Erro ao salvar relatório');
    }
  };

  /** Confirma o título editável e atualiza o estado do relatório atual */
  const handleTitleBlur = () => {
    setIsTitleEditing(false);
    const newName = titleValue.trim() || 'Sem título';
    setCurrentReport((prev) => ({ ...prev, name: newName }));
  };

  // ========================
  // Handlers: gráficos
  // ========================

  /**
   * Atualiza (ou cria) um gráfico em tempo real conforme o usuário edita o painel direito.
   * Busca dados reais na API automaticamente quando X e Y estão preenchidos.
   */
  const handleLiveChartChange = useCallback(async (config: ChartConfig) => {
    // Atualiza a lista de gráficos do relatório
    setCurrentReport((prev) => {
      const existingIndex = prev.charts.findIndex((c) => c.id === config.id);
      const updatedCharts =
        existingIndex >= 0
          ? prev.charts.map((c, i) => (i === existingIndex ? config : c))
          : [...prev.charts, config];
      return { ...prev, charts: updatedCharts };
    });

    // Busca dados reais se o gráfico está configurado
    await fetchChartData(config);
  }, [fetchChartData]);

  /** Remove gráfico do relatório atual */
  const handleDeleteChart = (id: string) => {
    setCurrentReport((prev) => ({
      ...prev,
      charts: prev.charts.filter((c) => c.id !== id),
    }));
    setChartData((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    // Se o gráfico removido estava sendo editado, volta para idle
    if (editingChart?.id === id) {
      setEditingChart(null);
      setConfigPanelActive(false);
    }
  };

  /** Carrega a config do gráfico no painel direito */
  const handleEditChart = (chart: ChartConfig) => {
    setEditingChart(chart);
    setConfigPanelActive(true);
  };

  /** Recarrega os dados de um gráfico específico via API */
  const handleRefreshChart = (chart: ChartConfig) => {
    fetchChartData(chart);
  };

  // Ativa o painel em modo "novo gráfico" (formulário em branco)
  const handleOpenNewChart = () => {
    setEditingChart(null);
    setConfigPanelActive(true);
  };

  // Volta ao estado idle (placeholder "nenhum selecionado")
  const handleResetConfigPanel = () => {
    setEditingChart(null);
    setConfigPanelActive(false);
  };

  // ========================
  // Filtro da lista
  // ========================

  const filteredReports = savedReports.filter(
    (r) => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========================
  // Acesso restrito
  // ========================

  if (!isManagerOrAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <Shield size={64} className="mx-auto mb-4 text-red-400" />
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Acesso Restrito
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Apenas administradores e gerentes podem acessar os relatórios.
          </p>
        </div>
      </div>
    );
  }

  // ========================
  // MODO BUILDER
  // ========================

  if (mode === 'builder') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Barra de topo do builder */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900">
          {/* Botão voltar para a lista */}
          <button
            onClick={() => setMode('list')}
            title="Voltar para a lista"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Título editável ao clicar */}
          {isTitleEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleBlur();
                if (e.key === 'Escape') {
                  setIsTitleEditing(false);
                  setTitleValue(currentReport.name);
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-emerald-500 bg-transparent px-3 py-1.5 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:text-white"
            />
          ) : (
            <button
              onClick={() => {
                setTitleValue(currentReport.name);
                setIsTitleEditing(true);
              }}
              title="Clique para renomear o relatório"
              className="min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-left text-lg font-semibold text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800"
            >
              {currentReport.name}
            </button>
          )}

          {/* Ações do builder */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleOpenNewChart}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus size={16} />
              Gráfico
            </button>
            <button
              onClick={handleSaveReport}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Save size={16} />
              Salvar
            </button>
          </div>
        </div>

        {/* Corpo do builder: painel esquerdo + área central + painel direito */}
        <div className="flex flex-1 overflow-hidden">
          {/* Painel esquerdo — campos disponíveis */}
          <FieldPanel
            activeSources={activeSources}
            fieldCatalog={catalogLoading ? EMPTY_CATALOG : fieldCatalog}
          />

          {/* Área central — grid de gráficos */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-slate-950">
            {currentReport.charts.length === 0 ? (
              // Estado vazio: nenhum gráfico adicionado ainda
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-gray-100 p-6 dark:bg-slate-800">
                  <LayoutGrid size={40} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Nenhum gráfico adicionado
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Clique em{' '}
                    <strong className="text-slate-700 dark:text-slate-300">+ Gráfico</strong>{' '}
                    no topo para começar a construir seu dashboard
                  </p>
                </div>
                <button
                  onClick={handleOpenNewChart}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus size={16} />
                  Adicionar Gráfico
                </button>
              </div>
            ) : (
              // Grid de gráficos + card "+" no final
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {currentReport.charts.map((chart) => (
                  <ChartWidget
                    key={chart.id}
                    config={chart}
                    data={chartData[chart.id] || {}}
                    isSelected={editingChart?.id === chart.id}
                    onClick={() => handleEditChart(chart)}
                    onDelete={() => handleDeleteChart(chart.id)}
                    onRefresh={() => handleRefreshChart(chart)}
                  />
                ))}

                {/* Card de atalho para adicionar mais gráficos */}
                <button
                  onClick={handleOpenNewChart}
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white text-slate-400 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-900/10 dark:hover:text-emerald-400"
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium">Adicionar Gráfico</span>
                </button>
              </div>
            )}
          </main>

          {/* Painel direito — sempre visível no builder */}
          <ChartConfigPanel
            allowedSources={currentReport.allowed_sources}
            active={configPanelActive}
            editingConfig={editingChart}
            onLiveChange={handleLiveChartChange}
            onClose={handleResetConfigPanel}
          />
        </div>
      </div>
    );
  }

  // ========================
  // MODO LISTA
  // ========================

  return (
    <div className="p-6">
      <PageHeader
        title="Relatórios"
        description="Crie e salve seus dashboards personalizados"
        icon={FileText}
        actions={
          <button
            onClick={handleNewReport}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus size={20} />
            Novo Relatório
          </button>
        }
      />

      {/* Campo de busca */}
      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar relatórios..."
        />
      </div>

      {/* Estado de carregamento */}
      {reportsLoading && (
        <div className="py-16 text-center">
          <p className="text-slate-500 dark:text-slate-400">Carregando relatórios...</p>
        </div>
      )}

      {/* Estado vazio */}
      {!reportsLoading && filteredReports.length === 0 && (
        <div className="py-16 text-center">
          <FileText size={64} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
            {searchTerm ? 'Nenhum relatório encontrado' : 'Nenhum relatório criado'}
          </h3>
          <p className="mb-6 text-slate-500 dark:text-slate-400">
            {searchTerm
              ? 'Tente ajustar o termo de busca'
              : 'Clique em "Novo Relatório" para criar seu primeiro dashboard personalizado'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleNewReport}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Plus size={18} />
              Criar Primeiro Relatório
            </button>
          )}
        </div>
      )}

      {/* Grid de cards de relatórios salvos */}
      {!reportsLoading && filteredReports.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-emerald-500/40 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              {/* Informações do relatório */}
              <div className="mb-4 flex-1">
                <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {report.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Por: {report.created_by_name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {report.charts_count}{' '}
                  {report.charts_count === 1 ? 'gráfico' : 'gráficos'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {new Date(report.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Ações do card */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenReport(report)}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Abrir
                </button>
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  title="Excluir relatório"
                  className="rounded-lg bg-red-600/10 p-2 text-red-500 transition-colors hover:bg-red-600/20 dark:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação de novo relatório */}
      <NewReportModal
        isOpen={showNewReportModal}
        onClose={() => setShowNewReportModal(false)}
        onConfirm={handleCreateReport}
      />
    </div>
  );
};

export default Reports;
