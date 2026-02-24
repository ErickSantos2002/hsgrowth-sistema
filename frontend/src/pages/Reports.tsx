/**
 * Página de Relatórios — Gerador de Dashboards Customizados (Power BI-style)
 *
 * Fase 1: dados mockados + persistência em localStorage.
 * Fase 2 (quando aprovado): substituir localStorage por chamadas à API:
 *   - CRUD /api/v1/reports/custom → savedReports
 *   - POST /api/v1/reports/query  → dados reais nos gráficos
 */

import React, { useState, useEffect, useRef } from 'react';
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
import {
  DataSource,
  AxisField,
  AggregationType,
  YFieldConfig,
  ChartConfig,
  QueryResponse,
  CustomReportConfig,
  SavedReport,
  generateMockData,
} from '../components/reports/reportTypes';

// Chave para persistência local (será removida na Fase 2)
const LOCAL_STORAGE_KEY = 'hsgrowth_reports';

// Gera IDs numéricos únicos para relatórios salvos localmente
let nextId = Date.now();
const getNextId = (): number => ++nextId;

const Reports: React.FC = () => {
  const { user: currentUser } = useAuth();

  // ========================
  // Estado principal
  // ========================

  // Modo de exibição: lista de relatórios ou builder
  const [mode, setMode] = useState<'list' | 'builder'>('list');

  // Lista de relatórios persistidos no localStorage
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Relatório sendo editado no builder
  const [currentReport, setCurrentReport] = useState<CustomReportConfig>({
    name: 'Novo Relatório',
    charts: [],
    allowed_sources: [],
  });

  // Dados de cada gráfico (key = chart.id); são regenerados como mock
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

  // Carrega relatórios do localStorage ao montar o componente
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedReport[];

        // Migração: relatórios salvos antes da implementação de múltiplas séries
        // tinham y_field (AxisField | null) + aggregation (AggregationType) em vez de y_fields[].
        // Converte automaticamente para o novo formato ao carregar.
        const migrated = parsed.map((report) => ({
          ...report,
          config: {
            ...report.config,
            charts: report.config.charts.map((chart) => {
              const legacy = chart as ChartConfig & {
                y_field?: AxisField | null;
                aggregation?: AggregationType;
              };
              if (!legacy.y_fields) {
                const yField = legacy.y_field ?? null;
                const agg: AggregationType = legacy.aggregation ?? 'count';
                const yFields: YFieldConfig[] = yField ? [{ field: yField, aggregation: agg }] : [];
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { y_field: _yf, aggregation: _agg, ...rest } = legacy;
                return { ...rest, y_fields: yFields } as ChartConfig;
              }
              return chart;
            }),
          },
        }));

        setSavedReports(migrated);
      }
    } catch {
      // Ignora dados corrompidos no localStorage
    }
  }, []);

  // Foca o input de título ao entrar em modo de edição inline
  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isTitleEditing]);

  // ========================
  // Handlers: modo lista
  // ========================

  /** Abre o modal de criação de novo relatório */
  const handleNewReport = () => {
    setShowNewReportModal(true);
  };

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

  /** Abre relatório salvo no builder, restaurando os dados mock de cada gráfico */
  const handleOpenReport = (report: SavedReport) => {
    setCurrentReport(report.config);
    setTitleValue(report.config.name);

    // Restaura as fontes permitidas salvas na configuração do relatório
    setActiveSources(report.config.allowed_sources ?? []);

    // Regenera dados mock para cada gráfico (não são persistidos no localStorage)
    const restoredData: Record<string, QueryResponse> = {};
    for (const chart of report.config.charts) {
      restoredData[chart.id] = generateMockData(
        chart.x_field,
        chart.y_fields,
        chart.x_group_by
      );
    }
    setChartData(restoredData);

    setMode('builder');
  };

  /** Remove relatório da lista e do localStorage */
  const handleDeleteReport = (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;
    const updated = savedReports.filter((r) => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // ========================
  // Handlers: builder
  // ========================

  /** Salva relatório atual no localStorage (cria novo ou atualiza existente) */
  const handleSaveReport = () => {
    try {
      const reportName = titleValue.trim() || 'Sem título';
      const existingIndex = savedReports.findIndex((r) => r.id === currentReport.id);
      let updatedList: SavedReport[];

      if (existingIndex >= 0) {
        // Atualiza relatório existente na lista
        updatedList = savedReports.map((r, i) =>
          i === existingIndex
            ? {
                ...r,
                name: reportName,
                updated_at: new Date().toISOString(),
                charts_count: currentReport.charts.length,
                config: { ...currentReport, name: reportName },
              }
            : r
        );
      } else {
        // Cria entrada nova
        const newId = getNextId();
        const newSaved: SavedReport = {
          id: newId,
          name: reportName,
          created_by_name: currentUser?.name || 'Usuário',
          updated_at: new Date().toISOString(),
          charts_count: currentReport.charts.length,
          config: { ...currentReport, name: reportName, id: newId },
        };
        updatedList = [...savedReports, newSaved];
        // Guarda o id no estado para que saves futuros atualizem o mesmo registro
        setCurrentReport((prev) => ({ ...prev, name: reportName, id: newId }));
      }

      setSavedReports(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      showSuccess('Relatório salvo com sucesso!');
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
   * Não fecha o painel — as mudanças são refletidas imediatamente no grid.
   */
  const handleLiveChartChange = (config: ChartConfig, data: QueryResponse) => {
    setCurrentReport((prev) => {
      const existingIndex = prev.charts.findIndex((c) => c.id === config.id);
      const updatedCharts =
        existingIndex >= 0
          ? prev.charts.map((c, i) => (i === existingIndex ? config : c))
          : [...prev.charts, config];
      return { ...prev, charts: updatedCharts };
    });

    setChartData((prev) => ({ ...prev, [config.id]: data }));
  };

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

  /** Regera dados mock para um gráfico específico */
  const handleRefreshChart = (chart: ChartConfig) => {
    const newData = generateMockData(chart.x_field, chart.y_fields, chart.x_group_by);
    setChartData((prev) => ({ ...prev, [chart.id]: newData }));
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
          <FieldPanel activeSources={activeSources} />

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

      {/* Estado vazio */}
      {filteredReports.length === 0 && (
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
      {filteredReports.length > 0 && (
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
