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
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/layout';
import { SearchInput } from '../components/common';
import { showSuccess, showError } from '../utils/toast';
import { useConfirm } from '../contexts/ConfirmContext';
import FieldPanel from '../components/reports/FieldPanel';
import ChartWidget from '../components/reports/ChartWidget';
import ChartConfigPanel from '../components/reports/ChartConfigPanel';
import NewReportModal from '../components/reports/NewReportModal';
import DrillDownModal from '../components/reports/DrillDownModal';
import CalculatedFieldModal from '../components/reports/CalculatedFieldModal';
import reportService from '../services/reportService';
import { useNavigate } from 'react-router-dom';
import {
  DataSource,
  ChartConfig,
  QueryResponse,
  CustomReportConfig,
  SavedReport,
  FieldCatalog,
  DrillDownCard,
  CalculatedField,
  CalculatedYFieldConfig,
} from '../components/reports/reportTypes';

// Catálogo vazio inicial (enquanto carrega da API)
const EMPTY_CATALOG: FieldCatalog = {
  cards: [],
  clients: [],
  persons: [],
  activities: [],
  tasks: [],
  card_history: [],
};

const Reports: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  // ========================
  // Estado principal
  // ========================

  // Controle dos painéis laterais
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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
  /**
   * Contador incrementado a cada clique em "+ Gráfico".
   * Usado como parte da key do ChartConfigPanel para forçar remontagem
   * completa do componente, garantindo formulário limpo mesmo quando
   * editingChart já era null (evita bug de estado anterior persistindo).
   */
  const [newChartSessionKey, setNewChartSessionKey] = useState(0);

  // Estado do drill-down: armazena qual gráfico e label foram clicados
  const [drillDownChart, setDrillDownChart] = useState<ChartConfig | null>(null);
  const [drillDownLabel, setDrillDownLabel] = useState<{ x: string; series?: string } | null>(null);
  const [drillDownCards, setDrillDownCards] = useState<DrillDownCard[]>([]);
  const [drillDownTotal, setDrillDownTotal] = useState(0);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  // Busca na lista de relatórios
  const [searchTerm, setSearchTerm] = useState('');

  // Controla qual exportação está em andamento (para mostrar loading no botão)
  const [exportingId, setExportingId] = useState<number | null>(null);

  // Modal de campos calculados
  const [showCalcFieldModal, setShowCalcFieldModal] = useState(false);
  const [editingCalcField, setEditingCalcField] = useState<CalculatedField | null>(null);

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

  // Mantém a ref de campos calculados sincronizada com o estado atual
  // sem precisar recriar callbacks que dependem dela
  useEffect(() => {
    calcFieldsRef.current = currentReport.calculated_fields;
  }, [currentReport.calculated_fields]);


  /**
   * Ref para o timer de debounce da chamada à API de query do gráfico.
   * Garante que keystokes rápidos no título não disparem múltiplas chamadas,
   * mas o estado `currentReport` (e portanto o Save) é sempre atualizado imediatamente.
   */
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ref que espelha currentReport.calculated_fields para uso dentro de callbacks com
   * useCallback sem precisar adicionar currentReport como dependência (evitaria recriação
   * do callback a cada mudança de qualquer campo do relatório).
   */
  const calcFieldsRef = useRef<CalculatedField[] | undefined>(undefined);

  // ========================
  // Helpers: busca de dados
  // ========================

  /**
   * Busca os dados reais de um gráfico via API e atualiza chartData.
   * Passa os campos calculados do relatório atual para que o backend
   * possa avaliar as fórmulas DAX-like para os campos Y calculados.
   * Silencia erros individuais de chart para não bloquear o builder.
   */
  const fetchChartData = useCallback(async (config: ChartConfig, calcFields?: CalculatedField[]) => {
    if (!config.x_field || config.y_fields.length === 0) return;

    try {
      const data = await reportService.queryChart(config, calcFields);
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
    // Injeta o id do banco no config para que saves futuros usem PUT em vez de POST
    setCurrentReport({ ...report.config, id: report.id });
    setTitleValue(report.config.name);
    setActiveSources(report.config.allowed_sources ?? []);
    setMode('builder');

    // Carrega dados reais de cada gráfico em paralelo, passando campos calculados
    const charts = report.config.charts.filter(
      (c) => c.x_field && c.y_fields.length > 0
    );
    const savedCalcFields = report.config.calculated_fields;

    const results = await Promise.allSettled(
      charts.map((chart) => reportService.queryChart(chart, savedCalcFields))
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
    const confirmed = await confirm({
      title: "Excluir Relatório",
      message: "Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!confirmed) return;

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
   *
   * O estado `currentReport` é atualizado IMEDIATAMENTE para que o botão Salvar
   * sempre leia os valores mais recentes (incluindo o título digitado agora mesmo).
   * A chamada à API é feita com debounce de 400ms para evitar spam de requests
   * enquanto o usuário ainda está digitando.
   */
  const handleLiveChartChange = useCallback((config: ChartConfig) => {
    // Atualiza a lista de gráficos do relatório imediatamente
    setCurrentReport((prev) => {
      const existingIndex = prev.charts.findIndex((c) => c.id === config.id);
      const updatedCharts =
        existingIndex >= 0
          ? prev.charts.map((c, i) => (i === existingIndex ? config : c))
          : [...prev.charts, config];
      return { ...prev, charts: updatedCharts };
    });

    // Debounce na chamada à API — evita requests a cada tecla digitada no título
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      // Usa a ref para ler os campos calculados sem precisar de currentReport como dep do callback
      fetchChartData(config, calcFieldsRef.current);
    }, 400);
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
    fetchChartData(chart, calcFieldsRef.current);
  };

  // ========================
  // Handlers: campos calculados
  // ========================

  /**
   * Salva (cria ou atualiza) um campo calculado no relatório atual.
   * Após salvar, recarrega todos os gráficos que referenciam esse campo.
   */
  const handleSaveCalculatedField = (field: CalculatedField) => {
    setCurrentReport((prev) => {
      const existing = prev.calculated_fields ?? [];
      const idx = existing.findIndex((cf) => cf.id === field.id);
      const updated = idx >= 0
        ? existing.map((cf, i) => (i === idx ? field : cf))
        : [...existing, field];
      return { ...prev, calculated_fields: updated };
    });

    // Recarrega gráficos que usam este campo calculado
    setCurrentReport((prev) => {
      const updatedCalcFields = prev.calculated_fields ?? [];
      prev.charts.forEach((chart) => {
        const usesThisField = chart.y_fields.some(
          (yf) => yf.is_calculated && (yf as CalculatedYFieldConfig).calculated_field_id === field.id
        );
        if (usesThisField) {
          fetchChartData(chart, updatedCalcFields);
        }
      });
      return prev;
    });
  };

  /**
   * Remove um campo calculado do relatório e limpa suas referências em todos os gráficos.
   */
  const handleDeleteCalculatedField = (fieldId: string) => {
    setCurrentReport((prev) => ({
      ...prev,
      calculated_fields: (prev.calculated_fields ?? []).filter((cf) => cf.id !== fieldId),
      charts: prev.charts.map((chart) => ({
        ...chart,
        // Remove o campo calculado excluído do eixo Y de todos os gráficos
        y_fields: chart.y_fields.filter(
          (yf) => !(yf.is_calculated && (yf as CalculatedYFieldConfig).calculated_field_id === fieldId)
        ),
      })),
    }));
  };

  // Ativa o painel em modo "novo gráfico" (formulário em branco)
  const handleOpenNewChart = () => {
    setEditingChart(null);
    // Incrementa a chave de sessão para forçar remontagem do ChartConfigPanel,
    // garantindo formulário limpo mesmo que editingChart já fosse null
    setNewChartSessionKey((prev) => prev + 1);
    setConfigPanelActive(true);
  };

  // Volta ao estado idle (placeholder "nenhum selecionado")
  const handleResetConfigPanel = () => {
    setEditingChart(null);
    setConfigPanelActive(false);
  };

  /**
   * Abre o drill-down ao clicar em uma barra/fatia do gráfico.
   * Chama o endpoint /reports/drill-down e exibe a modal com os cards retornados.
   */
  const handleBarClick = useCallback(async (
    chart: ChartConfig,
    xLabel: string,
    seriesLabel?: string,
  ) => {
    setDrillDownChart(chart);
    setDrillDownLabel({ x: xLabel, series: seriesLabel });
    setDrillDownCards([]);
    setDrillDownTotal(0);
    setDrillDownLoading(true);

    try {
      const result = await reportService.drillDown(chart, xLabel, seriesLabel);
      setDrillDownCards(result.cards);
      setDrillDownTotal(result.total);
    } catch {
      // Mantém a modal aberta com estado vazio em caso de erro
    } finally {
      setDrillDownLoading(false);
    }
  }, []);

  const handleCloseDrillDown = () => {
    setDrillDownChart(null);
    setDrillDownLabel(null);
    setDrillDownCards([]);
  };

  // ========================
  // Handler: exportação
  // ========================

  /**
   * Inicia o download do relatório no formato escolhido.
   * Exibe estado de loading no botão e fecha o menu ao concluir.
   */
  const handleDownloadReport = async (id: number, format: 'excel' | 'csv') => {
    setExportingId(id);
    try {
      await reportService.downloadReport(id, format);
    } catch {
      showError('Erro ao exportar relatório');
    } finally {
      setExportingId(null);
    }
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
        <div className="hidden shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900 lg:flex">
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
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Painel esquerdo — campos disponíveis (desktop only) */}
          <div
            className={`hidden h-full lg:block transition-all duration-300 relative ${
              leftPanelOpen ? 'w-64 shrink-0 opacity-100' : 'w-0 shrink-0 overflow-hidden opacity-0'
            }`}
          >
            <div className="w-64 h-full">
              <FieldPanel
                activeSources={activeSources}
                fieldCatalog={catalogLoading ? EMPTY_CATALOG : fieldCatalog}
                calculatedFields={currentReport.calculated_fields}
                onAddCalculatedField={() => {
                  setEditingCalcField(null);
                  setShowCalcFieldModal(true);
                }}
                onEditCalculatedField={(field) => {
                  setEditingCalcField(field);
                  setShowCalcFieldModal(true);
                }}
              />
            </div>
          </div>

          {/* Toggle Esquerdo */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center w-5 h-16 bg-white dark:bg-slate-800 border-y border-r border-gray-200 dark:border-slate-700 rounded-r-xl shadow-sm text-slate-400 hover:text-emerald-500 transition-all duration-300"
            style={{ left: leftPanelOpen ? '16rem' : '0' }}
            title={leftPanelOpen ? "Recolher painel" : "Expandir painel"}
          >
            <ChevronLeft size={16} className={`transition-transform duration-300 ${!leftPanelOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Área central — grid de gráficos */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-slate-950 min-w-0">
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
                    onBarClick={(xLabel, seriesLabel) =>
                      handleBarClick(chart, xLabel, seriesLabel)
                    }
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

          {/* Toggle Direito */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center w-5 h-16 bg-white dark:bg-slate-800 border-y border-l border-gray-200 dark:border-slate-700 rounded-l-xl shadow-sm text-slate-400 hover:text-emerald-500 transition-all duration-300"
            style={{ right: rightPanelOpen ? '20rem' : '0' }}
            title={rightPanelOpen ? "Recolher configurações" : "Expandir configurações"}
          >
            <ChevronRight size={16} className={`transition-transform duration-300 ${!rightPanelOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Painel direito — desktop only */}
          <div
            className={`hidden h-full lg:block transition-all duration-300 relative ${
              rightPanelOpen ? 'w-80 shrink-0 opacity-100' : 'w-0 shrink-0 overflow-hidden opacity-0'
            }`}
          >
            <div className="w-80 h-full overflow-hidden">
              <ChartConfigPanel
                key={editingChart?.id ?? `new-${newChartSessionKey}`}
                allowedSources={currentReport.allowed_sources}
                active={configPanelActive}
                editingConfig={editingChart}
                onLiveChange={handleLiveChartChange}
                onClose={handleResetConfigPanel}
              />
            </div>
          </div>
        </div>

        {/* Modal de drill-down — exibida ao clicar em uma barra/fatia */}
        {drillDownChart && drillDownLabel && (
          <DrillDownModal
            title={`${drillDownLabel.series ? `${drillDownLabel.series} — ` : ''}${drillDownLabel.x}`}
            cards={drillDownCards}
            total={drillDownTotal}
            loading={drillDownLoading}
            onClose={handleCloseDrillDown}
            onOpenCard={(cardId) => {
              handleCloseDrillDown();
              navigate(`/cards/${cardId}`);
            }}
          />
        )}

        {/* Modal de campo calculado — criar ou editar */}
        {showCalcFieldModal && activeSources.length > 0 && (
          <CalculatedFieldModal
            isOpen={showCalcFieldModal}
            onClose={() => {
              setShowCalcFieldModal(false);
              setEditingCalcField(null);
            }}
            onSave={handleSaveCalculatedField}
            editingField={editingCalcField}
            allowedSource={activeSources[0]}
            availableMetrics={
              (catalogLoading ? EMPTY_CATALOG : fieldCatalog)[activeSources[0]] ?? []
            }
          />
        )}
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

                {/* Botão de exportação com menu dropdown (componente local com ref) */}
                <ExportButton
                  loading={exportingId === report.id}
                  onSelect={(format) => handleDownloadReport(report.id, format)}
                />

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

// ========================
// COMPONENTE AUXILIAR: BOTÃO DE EXPORTAÇÃO
// ========================

interface ExportButtonProps {
  loading: boolean;
  onSelect: (format: 'excel' | 'csv') => void;
}

/**
 * Botão de download com mini-menu de formato (Excel / CSV).
 * Usa ref para fechar o menu ao clicar fora — mesmo padrão do SelectMenu.
 */
const ExportButton: React.FC<ExportButtonProps> = ({ loading, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora do container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !loading && setIsOpen((prev) => !prev)}
        disabled={loading}
        title="Exportar relatório"
        className="rounded-lg bg-blue-600/10 p-2 text-blue-500 transition-colors hover:bg-blue-600/20 disabled:opacity-50 dark:text-blue-400"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        ) : (
          <Download size={16} />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { setIsOpen(false); onSelect('excel'); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); onSelect('csv'); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
};
