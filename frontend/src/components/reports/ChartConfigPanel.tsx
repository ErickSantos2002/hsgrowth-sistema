import React, { useState, useEffect, useRef } from 'react';
import { X, BarChart3, TrendingUp, PieChart, Table, MousePointerClick, Calendar, DollarSign, Tag, User, Hash, GripVertical } from 'lucide-react';
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
  DATA_SOURCE_LABELS,
  PERIOD_OPTIONS,
  generateMockData,
} from './reportTypes';

interface ChartConfigPanelProps {
  /**
   * Fontes de dados permitidas neste relatório.
   * Não é mais usado internamente (a fonte vem com o campo arrastado),
   * mas mantido na interface para compatibilidade com o componente pai.
   */
  allowedSources: DataSource[];
  /** true = mostra o formulário; false = mostra placeholder "nenhum selecionado" */
  active: boolean;
  /** Preenchido quando o usuário está editando um gráfico existente */
  editingConfig?: ChartConfig | null;
  /**
   * Chamado em tempo real sempre que o formulário muda e xAxisField está definido.
   * O pai atualiza (ou cria) o gráfico correspondente no grid imediatamente.
   */
  onLiveChange: (config: ChartConfig, data: QueryResponse) => void;
  /** Fecha o painel e volta ao estado idle */
  onClose: () => void;
}

/** Estado visual da zona de drop */
type DropState = 'idle' | 'valid' | 'invalid';

const CHART_TYPE_OPTIONS: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar', label: 'Barras', icon: <BarChart3 size={18} /> },
  { type: 'line', label: 'Linha', icon: <TrendingUp size={18} /> },
  { type: 'pie', label: 'Pizza', icon: <PieChart size={18} /> },
  { type: 'table', label: 'Tabela', icon: <Table size={18} /> },
];

const GROUP_BY_OPTIONS: { value: GroupByType; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

/** Rótulos curtos para os badges de agregação nos chips Y */
const AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: 'Contagem',
  distinct_count: 'Cont. Distinta',
  sum: 'Soma',
  avg: 'Média',
};

/** Ícone correspondente ao tipo de campo (usado nos chips das drop zones) */
const FieldTypeIcon: React.FC<{ fieldType: AxisField['field_type']; size?: number }> = ({
  fieldType,
  size = 12,
}) => {
  const cls = 'shrink-0';
  switch (fieldType) {
    case 'date':
      return <Calendar size={size} className={cls} />;
    case 'currency':
      return <DollarSign size={size} className={cls} />;
    case 'category':
      return <Tag size={size} className={cls} />;
    case 'user':
      return <User size={size} className={cls} />;
    case 'number':
      return <Hash size={size} className={cls} />;
    default:
      return null;
  }
};

/**
 * Determina a agregação padrão ao soltar um campo no eixo Y.
 * - key 'count' → 'count'
 * - number/currency → 'sum'
 * - outros → 'distinct_count'
 */
const getDefaultAggregation = (field: AxisField): AggregationType => {
  if (field.key === 'count') return 'count';
  if (field.field_type === 'number' || field.field_type === 'currency') return 'sum';
  return 'distinct_count';
};

/**
 * Cicla a agregação para o próximo valor disponível conforme o tipo do campo.
 * - number/currency: count → distinct_count → sum → avg → count
 * - outros: count → distinct_count → count
 */
const cycleAggregation = (current: AggregationType, field: AxisField): AggregationType => {
  const isNumeric = field.field_type === 'number' || field.field_type === 'currency';
  if (isNumeric) {
    const cycle: AggregationType[] = ['count', 'distinct_count', 'sum', 'avg'];
    const idx = cycle.indexOf(current);
    return cycle[(idx + 1) % cycle.length];
  }
  const cycle: AggregationType[] = ['count', 'distinct_count'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
};

/**
 * Painel lateral direito de configuração de gráfico.
 *
 * Fica fixo à direita do builder. Os campos são arrastados do painel esquerdo
 * para as zonas de drop dos eixos X e Y. Mudanças são propagadas para o pai
 * em tempo real via `onLiveChange`.
 * O título usa debounce de 400ms para evitar atualizações excessivas ao digitar.
 *
 * Eixo Y suporta múltiplas séries:
 * - bar/line: até 4 campos Y (cada um vira uma série colorida)
 * - pie/table: apenas 1 campo Y (drop substitui o existente)
 */
const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  active,
  editingConfig,
  onLiveChange,
  onClose,
}) => {
  // ========================
  // Estado do formulário
  // ========================

  const [title, setTitle] = useState('Novo Gráfico');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<AxisField | null>(null);
  const [xGroupBy, setXGroupBy] = useState<GroupByType>('month');
  /** Lista de campos Y com agregação individual — substitui yAxisField + aggregation */
  const [yFields, setYFields] = useState<YFieldConfig[]>([]);
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  /** Estado visual das zonas de drop */
  const [xDropState, setXDropState] = useState<DropState>('idle');
  const [yDropState, setYDropState] = useState<DropState>('idle');

  /**
   * ID estável do gráfico atual.
   * Ao criar novo, gerado uma única vez por "sessão de criação".
   * Ao editar, assume o ID do gráfico existente.
   */
  const [currentChartId, setCurrentChartId] = useState<string>(() => crypto.randomUUID());

  /**
   * Versão debounced do título — atualiza 400ms após o último keystroke.
   * É esse valor que vai para `onLiveChange` para não gerar um update por tecla.
   */
  const [debouncedTitle, setDebouncedTitle] = useState(title);

  // Rastreia o ID do último editingConfig para detectar troca de gráfico
  const prevEditingIdRef = useRef<string | null | undefined>(undefined);

  // ========================
  // Preenche/reseta o formulário ao trocar de gráfico selecionado
  // ========================

  useEffect(() => {
    const newId = editingConfig?.id ?? null;

    // Mesmo gráfico (apenas props do config mudaram via live update) — não resetar
    if (newId === prevEditingIdRef.current) return;
    prevEditingIdRef.current = newId;

    if (editingConfig) {
      setTitle(editingConfig.title);
      setDebouncedTitle(editingConfig.title); // sem debounce ao carregar
      setChartType(editingConfig.type);
      setXAxisField(editingConfig.x_field);
      setXGroupBy(editingConfig.x_group_by || 'month');
      setYFields(editingConfig.y_fields);
      setPeriod(editingConfig.period);
      setStartDate(editingConfig.start_date || '');
      setEndDate(editingConfig.end_date || '');
      setCurrentChartId(editingConfig.id);
    } else {
      // Novo gráfico: reseta tudo e gera ID novo
      setTitle('Novo Gráfico');
      setDebouncedTitle('Novo Gráfico');
      setChartType('bar');
      setXAxisField(null);
      setXGroupBy('month');
      setYFields([]);
      setPeriod('this_month');
      setStartDate('');
      setEndDate('');
      setCurrentChartId(crypto.randomUUID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingConfig?.id]);

  // Debounce do título: propaga para debouncedTitle após 400ms sem digitar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitle(title), 400);
    return () => clearTimeout(timer);
  }, [title]);

  // ========================
  // Atualização em tempo real
  // ========================

  /**
   * Dispara `onLiveChange` sempre que qualquer campo muda.
   * O título usa `debouncedTitle` para evitar um update por tecla digitada.
   * Só executa quando o painel está ativo, xAxisField e pelo menos 1 campo Y foram preenchidos.
   */
  useEffect(() => {
    if (!active || !xAxisField || yFields.length === 0) return;

    const isDate = xAxisField.field_type === 'date';

    const config: ChartConfig = {
      id: currentChartId,
      type: chartType,
      title: debouncedTitle.trim() || 'Novo Gráfico',
      x_field: xAxisField,
      x_group_by: isDate ? xGroupBy : undefined,
      y_fields: yFields,
      period,
      start_date: period === 'custom' ? startDate : undefined,
      end_date: period === 'custom' ? endDate : undefined,
    };

    const data = generateMockData(xAxisField, yFields, isDate ? xGroupBy : undefined);
    onLiveChange(config, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTitle,
    chartType,
    xAxisField,
    xGroupBy,
    yFields,
    period,
    startDate,
    endDate,
    active,
    currentChartId,
  ]);

  // ========================
  // Handlers de drag & drop — Eixo X
  // ========================

  const handleXDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // types está disponível em dragOver (ao contrário de getData(), que é restrito por segurança)
    const isGroupable = e.dataTransfer.types.includes('application/field-groupable');
    setXDropState(isGroupable ? 'valid' : 'invalid');
    e.dataTransfer.dropEffect = isGroupable ? 'copy' : 'none';
  };

  const handleXDragLeave = () => setXDropState('idle');

  const handleXDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setXDropState('idle');

    let field: AxisField;
    try {
      field = JSON.parse(e.dataTransfer.getData('application/json')) as AxisField;
    } catch {
      return;
    }

    // Eixo X só aceita campos groupable
    if (!field.groupable) return;

    // Proíbe o mesmo campo nos dois eixos
    const isInY = yFields.some(
      (yf) => yf.field.key === field.key && yf.field.source === field.source
    );
    if (isInY) return;

    setXAxisField(field);
    // Reseta o agrupamento para o padrão ao trocar o campo
    setXGroupBy('month');
  };

  // ========================
  // Handlers de drag & drop — Eixo Y
  // ========================

  const handleYDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Eixo Y sempre aceita quando a zona está visível
    setYDropState('valid');
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleYDragLeave = () => setYDropState('idle');

  const handleYDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setYDropState('idle');

    let field: AxisField;
    try {
      field = JSON.parse(e.dataTransfer.getData('application/json')) as AxisField;
    } catch {
      return;
    }

    // Proíbe o mesmo campo nos dois eixos
    if (xAxisField && field.key === xAxisField.key && field.source === xAxisField.source) return;

    const defaultAgg = getDefaultAggregation(field);

    if (chartType === 'pie' || chartType === 'table') {
      // pie/table: drop sempre substitui — lista tem no máximo 1 item
      setYFields([{ field, aggregation: defaultAgg }]);
    } else {
      // bar/line: adiciona à lista até 4 campos, ignorando duplicatas
      setYFields((prev) => {
        if (prev.length >= 4) return prev;
        const isDuplicate = prev.some(
          (yf) => yf.field.key === field.key && yf.field.source === field.source
        );
        if (isDuplicate) return prev;
        return [...prev, { field, aggregation: defaultAgg }];
      });
    }
  };

  // ========================
  // Handlers dos chips do eixo Y
  // ========================

  /** Remove um campo Y pelo índice */
  const handleRemoveYField = (index: number) => {
    setYFields((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Cicla a agregação do chip Y pelo índice.
   * - number/currency: count → distinct_count → sum → avg → count
   * - outros: count → distinct_count → count
   */
  const handleCycleAggregation = (index: number) => {
    setYFields((prev) =>
      prev.map((yf, i) => {
        if (i !== index) return yf;
        return { ...yf, aggregation: cycleAggregation(yf.aggregation, yf.field) };
      })
    );
  };

  // ========================
  // Campos derivados
  // ========================

  const xFieldIsDate = xAxisField?.field_type === 'date';

  /**
   * Determina se a zona dashed de drop Y deve ser exibida.
   * - bar/line: visível quando há menos de 4 campos Y
   * - pie/table: visível apenas quando a lista está vazia (1 item substitui)
   */
  const canReceiveMoreY =
    chartType === 'bar' || chartType === 'line'
      ? yFields.length < 4
      : yFields.length === 0;

  // ========================
  // Estado idle
  // ========================

  if (!active) {
    return (
      <aside className="flex w-80 shrink-0 flex-col items-center justify-center border-l border-gray-200 bg-white p-6 text-center dark:border-slate-700/50 dark:bg-slate-900">
        <div className="rounded-full bg-gray-100 p-5 dark:bg-slate-800">
          <MousePointerClick size={28} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          Nenhum gráfico selecionado
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          Clique no cabeçalho de um gráfico para editá-lo ou em{' '}
          <strong className="text-slate-500 dark:text-slate-400">+ Gráfico</strong> para criar um
          novo.
        </p>
      </aside>
    );
  }

  // ========================
  // Componente auxiliar: zona de drop do eixo X
  // ========================

  /**
   * Renderiza a drop zone do eixo X — preenchida (chip) ou vazia (placeholder dashed).
   */
  const renderXDropZone = () => {
    const borderClass =
      xDropState === 'valid'
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
        : xDropState === 'invalid'
          ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
          : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800/50';

    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Eixo X — Dimensão
        </label>

        {xAxisField ? (
          // Campo preenchido — chip com informações do campo
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            <FieldTypeIcon fieldType={xAxisField.field_type} size={13} />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {xAxisField.label}
            </span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {DATA_SOURCE_LABELS[xAxisField.source]}
            </span>
            <button
              type="button"
              onClick={() => setXAxisField(null)}
              title="Remover campo"
              className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          // Zona vazia — aceita drop
          <div
            onDragOver={handleXDragOver}
            onDragLeave={handleXDragLeave}
            onDrop={handleXDrop}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-xs transition-colors ${borderClass}`}
          >
            {xDropState === 'invalid' ? (
              <span className="text-red-500 dark:text-red-400">Campo inválido para este eixo</span>
            ) : xDropState === 'valid' ? (
              <span className="text-emerald-600 dark:text-emerald-400">Solte aqui</span>
            ) : (
              <>
                <GripVertical size={13} className="text-slate-300 dark:text-slate-600" />
                <span className="text-slate-400 dark:text-slate-500">Arraste uma dimensão aqui</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========================
  // Componente auxiliar: zona de drop do eixo Y (múltiplas séries)
  // ========================

  /**
   * Renderiza a seção do eixo Y com:
   * - Um chip por campo Y adicionado (com badge de agregação clicável)
   * - Zona dashed de drop abaixo (visível quando pode receber mais campos)
   */
  const renderYDropZone = () => {
    const yBorderClass =
      yDropState === 'valid'
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
        : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800/50';

    const maxLabel =
      chartType === 'bar' || chartType === 'line' ? '(máx. 4)' : '(1 campo)';

    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Eixo Y — Métrica {maxLabel}
        </label>

        {/* Lista de chips — um por campo Y adicionado */}
        {yFields.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {yFields.map((yf, index) => (
              <div
                key={`${yf.field.source}-${yf.field.key}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <FieldTypeIcon fieldType={yf.field.field_type} size={13} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                  {yf.field.label}
                </span>
                {/* Badge da fonte de dados */}
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  {DATA_SOURCE_LABELS[yf.field.source]}
                </span>
                {/* Badge de agregação — clicável, cicla pelas opções disponíveis */}
                <button
                  type="button"
                  onClick={() => handleCycleAggregation(index)}
                  title="Clique para mudar a agregação"
                  className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                  {AGGREGATION_LABELS[yf.aggregation]}
                </button>
                {/* Botão de remoção */}
                <button
                  type="button"
                  onClick={() => handleRemoveYField(index)}
                  title="Remover campo"
                  className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Zona dashed de drop — visível apenas quando pode receber mais campos */}
        {canReceiveMoreY && (
          <div
            onDragOver={handleYDragOver}
            onDragLeave={handleYDragLeave}
            onDrop={handleYDrop}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-xs transition-colors ${yBorderClass}`}
          >
            {yDropState === 'valid' ? (
              <span className="text-emerald-600 dark:text-emerald-400">Solte aqui</span>
            ) : (
              <>
                <GripVertical size={13} className="text-slate-300 dark:text-slate-600" />
                <span className="text-slate-400 dark:text-slate-500">
                  {yFields.length === 0
                    ? 'Arraste qualquer campo aqui'
                    : 'Arraste outro campo para comparar'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========================
  // Formulário
  // ========================

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900">
      {/* Cabeçalho */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-slate-700/50">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {editingConfig ? 'Editar Gráfico' : 'Novo Gráfico'}
        </p>
        <button
          onClick={onClose}
          title="Fechar painel"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X size={16} />
        </button>
      </div>

      {/* Formulário scrollável — sem rodapé de ações, tudo é em tempo real */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">

        {/* Título */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Título do gráfico
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Negócios por Canal"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        {/* Tipo de gráfico */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Tipo de gráfico
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {CHART_TYPE_OPTIONS.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setChartType(type);
                  // pie/table só aceitam 1 métrica — descarta as extras ao mudar o tipo
                  if ((type === 'pie' || type === 'table') && yFields.length > 1) {
                    setYFields((prev) => prev.slice(0, 1));
                  }
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
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

        {/* Eixo X — zona de drop */}
        {renderXDropZone()}

        {/* Agrupamento por período (apenas campos de data no eixo X) */}
        {xFieldIsDate && xAxisField && (
          <div>
            <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">Agrupar por</p>
            <div className="flex gap-1">
              {GROUP_BY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setXGroupBy(value)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
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

        {/* Eixo Y — chips múltiplos + zona de drop */}
        {renderYDropZone()}

        {/* Período */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Indicador visual de atualização em tempo real */}
        {xAxisField && yFields.length > 0 && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            As alterações são aplicadas automaticamente
          </p>
        )}

        {/* Orientação quando xAxisField ou yFields ainda não foram preenchidos */}
        {(!xAxisField || yFields.length === 0) && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {!xAxisField
              ? 'Arraste um campo para o Eixo X para visualizar o gráfico'
              : 'Arraste um campo para o Eixo Y para visualizar o gráfico'}
          </p>
        )}
      </div>
    </aside>
  );
};

export default ChartConfigPanel;
