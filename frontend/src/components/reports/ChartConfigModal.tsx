import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Table, Eye } from 'lucide-react';
import BaseModal from '../common/BaseModal';
import { SelectMenu } from '../common/SelectMenu';
import {
  DataSource,
  AxisField,
  ChartType,
  AggregationType,
  GroupByType,
  YFieldConfig,
  ChartConfig,
  QueryResponse,
  PeriodType,
  FIELD_CATALOG,
  PERIOD_OPTIONS,
  generateMockData,
} from './reportTypes';
import ChartWidget from './ChartWidget';

interface ChartConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado quando o usuário confirma (após pré-visualizar) */
  onConfirm: (config: ChartConfig, data: QueryResponse) => void;
  /** Preenchido quando o usuário está editando um gráfico existente */
  editingConfig?: ChartConfig | null;
  editingData?: QueryResponse | null;
  /** Restringe as fontes de dados disponíveis às escolhidas na criação do relatório */
  allowedSources?: DataSource[];
}

// Tipos de gráfico disponíveis com ícone e rótulo
const CHART_TYPE_OPTIONS: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar', label: 'Barras', icon: <BarChart3 size={22} /> },
  { type: 'line', label: 'Linha', icon: <TrendingUp size={22} /> },
  { type: 'pie', label: 'Pizza', icon: <PieChart size={22} /> },
  { type: 'table', label: 'Tabela', icon: <Table size={22} /> },
];

const ALL_DATA_SOURCE_OPTIONS = [
  { value: 'cards', label: 'Negócios' },
  { value: 'clients', label: 'Clientes' },
  { value: 'persons', label: 'Pessoas' },
  { value: 'activities', label: 'Atividades' },
];

const GROUP_BY_OPTIONS: { value: GroupByType; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

/**
 * Modal de configuração de gráfico.
 *
 * Divide-se em dois painéis:
 * - Esquerdo: formulário de configuração (tipo, fonte, campos X/Y, período)
 * - Direito: pré-visualização com dados mock antes de adicionar ao relatório
 *
 * O botão "Adicionar ao Relatório" só é habilitado após o usuário clicar em
 * "Pré-visualizar", garantindo que ele viu o resultado antes de confirmar.
 */
const ChartConfigModal: React.FC<ChartConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  editingConfig,
  editingData,
  allowedSources,
}) => {
  // Estado do formulário
  const [title, setTitle] = useState('Novo Gráfico');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dataSource, setDataSource] = useState<DataSource>('cards');
  const [xField, setXField] = useState('');
  const [xGroupBy, setXGroupBy] = useState<GroupByType>('month');
  const [yField, setYField] = useState('count');
  const [aggregation, setAggregation] = useState<AggregationType>('count');
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estado da pré-visualização
  const [previewData, setPreviewData] = useState<QueryResponse | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Primeira fonte permitida — usada como padrão ao criar novo gráfico
  const defaultSource: DataSource = allowedSources?.[0] ?? 'cards';

  // Opções de fonte filtradas pelas fontes permitidas do relatório
  const dataSourceOptions = ALL_DATA_SOURCE_OPTIONS.filter(
    (opt) => !allowedSources || allowedSources.includes(opt.value as DataSource)
  );

  // Preenche o formulário ao editar gráfico existente ou reseta ao criar novo
  useEffect(() => {
    if (!isOpen) return;

    if (editingConfig) {
      setTitle(editingConfig.title);
      setChartType(editingConfig.type);
      // Extrai dataSource, xField e yField do AxisField para manter o formulário com strings
      setDataSource(editingConfig.x_field?.source ?? defaultSource);
      setXField(editingConfig.x_field?.key ?? '');
      setXGroupBy(editingConfig.x_group_by || 'month');
      // Compatibilidade: usa o primeiro campo Y (modal legado suporta apenas 1)
      setYField(editingConfig.y_fields[0]?.field.key ?? 'count');
      setAggregation(editingConfig.y_fields[0]?.aggregation ?? 'count');
      setPeriod(editingConfig.period);
      setStartDate(editingConfig.start_date || '');
      setEndDate(editingConfig.end_date || '');
      setPreviewData(editingData || null);
      setHasPreviewed(!!editingData);
    } else {
      // Reset para criação de novo gráfico, usando a primeira fonte permitida como padrão
      setTitle('Novo Gráfico');
      setChartType('bar');
      setDataSource(defaultSource);
      setXField('');
      setXGroupBy('month');
      setYField('count');
      setAggregation('count');
      setPeriod('this_month');
      setStartDate('');
      setEndDate('');
      setPreviewData(null);
      setHasPreviewed(false);
    }
  }, [isOpen, editingConfig, editingData, defaultSource]);

  // Campos groupable (eixo X) da fonte selecionada
  const groupableFields = FIELD_CATALOG[dataSource].filter((f) => f.groupable);

  // Campos aggregatable (eixo Y) da fonte selecionada
  const aggregatableFields = FIELD_CATALOG[dataSource].filter((f) => f.aggregatable);

  // Campo X atual — determina se deve mostrar "Agrupar por"
  const selectedXFieldDef = groupableFields.find((f) => f.key === xField);
  const xFieldIsDate = selectedXFieldDef?.field_type === 'date';

  // Campo Y atual — determina se deve mostrar seletor de agregação
  const selectedYFieldDef = aggregatableFields.find((f) => f.key === yField);
  const yFieldIsNumeric =
    selectedYFieldDef?.field_type === 'currency' ||
    selectedYFieldDef?.field_type === 'number';

  // Opções do SelectMenu para eixo X
  const xFieldOptions = [
    { value: '', label: 'Selecione o campo X...' },
    ...groupableFields.map((f) => ({ value: f.key, label: f.label })),
  ];

  // Opções do SelectMenu para eixo Y
  const yFieldOptions = [
    { value: 'count', label: 'Quantidade (contagem)' },
    ...aggregatableFields
      .filter((f) => f.key !== 'count')
      .map((f) => ({ value: f.key, label: f.label })),
  ];

  // Muda fonte de dados e reseta campos dependentes
  const handleDataSourceChange = (value: string) => {
    setDataSource(value as DataSource);
    setXField('');
    setYField('count');
    setAggregation('count');
    setPreviewData(null);
    setHasPreviewed(false);
  };

  /**
   * Constrói um AxisField a partir dos campos string internos do formulário.
   * Necessário para compatibilidade com a nova API de generateMockData e ChartConfig.
   */
  const buildAxisField = (key: string, isX: boolean): AxisField | null => {
    if (!key) return null;
    const fieldDef = FIELD_CATALOG[dataSource].find((f) => f.key === key);
    if (!fieldDef) return null;
    return {
      key: fieldDef.key,
      label: fieldDef.label,
      source: dataSource,
      field_type: fieldDef.field_type,
      groupable: isX ? true : false,
      aggregatable: isX ? false : true,
    };
  };

  // Gera dados mock e exibe a pré-visualização
  const handlePreview = () => {
    const xAxisField = buildAxisField(xField, true);
    const yAxisField = buildAxisField(yField, false);
    // Monta lista de campos Y para compatibilidade com generateMockData
    const yFields: YFieldConfig[] = yAxisField ? [{ field: yAxisField, aggregation }] : [];
    const data = generateMockData(
      xAxisField,
      yFields,
      xFieldIsDate && xField ? xGroupBy : undefined
    );
    setPreviewData(data);
    setHasPreviewed(true);
  };

  // Monta o ChartConfig e passa para o componente pai
  const handleConfirm = () => {
    if (!hasPreviewed || !previewData) return;

    const yAxisField = buildAxisField(yField, false);
    const config: ChartConfig = {
      id: editingConfig?.id || crypto.randomUUID(),
      type: chartType,
      title: title.trim() || 'Sem título',
      x_field: buildAxisField(xField, true),
      x_group_by: xFieldIsDate && xField ? xGroupBy : undefined,
      y_fields: yAxisField ? [{ field: yAxisField, aggregation }] : [],
      period,
      start_date: period === 'custom' ? startDate : undefined,
      end_date: period === 'custom' ? endDate : undefined,
    };

    onConfirm(config, previewData);
  };

  const isFormValid = title.trim() !== '' && xField !== '';

  // Config temporária para o ChartWidget de pré-visualização
  const previewYField = buildAxisField(yField, false);
  const previewConfig: ChartConfig = {
    id: 'preview',
    type: chartType,
    title: title || 'Pré-visualização',
    x_field: buildAxisField(xField, true),
    x_group_by: xFieldIsDate && xField ? xGroupBy : undefined,
    y_fields: previewYField ? [{ field: previewYField, aggregation }] : [],
    period,
  };

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!hasPreviewed}
        title={!hasPreviewed ? 'Clique em Pré-visualizar antes de adicionar' : undefined}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {editingConfig ? 'Salvar Alterações' : 'Adicionar ao Relatório'}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingConfig ? 'Editar Gráfico' : 'Novo Gráfico'}
      subtitle="Configure o gráfico e pré-visualize antes de adicionar"
      size="2xl"
      footer={footer}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ======================== */}
        {/* Painel Esquerdo: Configuração */}
        {/* ======================== */}
        <div className="space-y-5">
          {/* Título do gráfico */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Título do gráfico
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Negócios por Canal de Aquisição"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Tipo de gráfico — grid visual 2x2 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de gráfico
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPE_OPTIONS.map(({ type, label, icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChartType(type)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors ${
                    chartType === type
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-slate-500 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fonte de dados */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Fonte de dados
            </label>
            <SelectMenu
              value={dataSource}
              options={dataSourceOptions}
              onChange={handleDataSourceChange}
            />
          </div>

          {/* Eixo X (Dimensão) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Eixo X — Dimensão
            </label>
            <SelectMenu
              value={xField}
              options={xFieldOptions}
              onChange={(val) => {
                setXField(val);
                setPreviewData(null);
                setHasPreviewed(false);
              }}
            />

            {/* Agrupar por (apenas para campos de data) */}
            {xFieldIsDate && xField && (
              <div className="mt-2">
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Agrupar por
                </p>
                <div className="flex gap-1.5">
                  {GROUP_BY_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setXGroupBy(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        xGroupBy === value
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-slate-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Eixo Y (Métrica) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Eixo Y — Métrica
            </label>
            <SelectMenu
              value={yField}
              options={yFieldOptions}
              onChange={(val) => {
                setYField(val);
                // Contagem não precisa de tipo de agregação
                setAggregation(val === 'count' ? 'count' : 'sum');
                setPreviewData(null);
                setHasPreviewed(false);
              }}
            />

            {/* Tipo de agregação (apenas para campos numéricos/moeda) */}
            {yField !== 'count' && yFieldIsNumeric && (
              <div className="mt-2">
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Agregação
                </p>
                <div className="flex gap-1.5">
                  {[
                    { value: 'sum', label: 'Soma' },
                    { value: 'avg', label: 'Média' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAggregation(value as AggregationType)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        aggregation === value
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-slate-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Período */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Período
            </label>
            <SelectMenu
              value={period}
              options={PERIOD_OPTIONS}
              onChange={(val) => setPeriod(val as PeriodType)}
            />

            {/* Datas personalizadas */}
            {period === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================== */}
        {/* Painel Direito: Pré-visualização */}
        {/* ======================== */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pré-visualização
            </label>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!isFormValid}
              title={!isFormValid ? 'Preencha o título e o campo X antes de pré-visualizar' : undefined}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <Eye size={13} />
              Pré-visualizar
            </button>
          </div>

          {!hasPreviewed ? (
            // Estado inicial — instrução para o usuário
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
              <BarChart3 size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-500">
                Configure o gráfico e clique em{' '}
                <strong className="text-slate-500 dark:text-slate-400">Pré-visualizar</strong>{' '}
                para ver como ficará.
              </p>
            </div>
          ) : previewData ? (
            // Renderiza o ChartWidget com dados mock para pré-visualização
            <ChartWidget
              config={previewConfig}
              data={previewData}
              onClick={() => {}}
              onDelete={() => {}}
              onRefresh={handlePreview}
            />
          ) : null}
        </div>
      </div>
    </BaseModal>
  );
};

export default ChartConfigModal;
