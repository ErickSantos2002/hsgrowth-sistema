import React, { useState, useEffect, useRef } from 'react';
import { X, BarChart3, TrendingUp, PieChart, Table, MousePointerClick, Calendar, DollarSign, Tag, User, Hash, GripVertical, Activity, Crosshair, Hexagon, Filter, Target, ListFilter } from 'lucide-react';
import reportService from '../../services/reportService';
import { SelectMenu } from '../common/SelectMenu';
import {
  DataSource,
  AxisField,
  ChartType,
  AggregationType,
  GroupByType,
  YFieldConfig,
  CalculatedYFieldConfig,
  ChartConfig,
  PeriodType,
  DATA_SOURCE_LABELS,
  PERIOD_OPTIONS,
  SERIES_COLORS,
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
   * O pai recebe apenas a config e é responsável por chamar a API para buscar os dados.
   */
  onLiveChange: (config: ChartConfig) => void;
  /** Fecha o painel e volta ao estado idle */
  onClose: () => void;
}

/** Estado visual da zona de drop */
type DropState = 'idle' | 'valid' | 'invalid';

const CHART_TYPE_OPTIONS: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar',            label: 'Barras',        icon: <BarChart3 size={18} /> },
  { type: 'bar_horizontal', label: 'Barras Horiz.', icon: <BarChart3 size={18} style={{ transform: 'rotate(90deg)' }} /> },
  { type: 'line',    label: 'Linha',     icon: <TrendingUp  size={18} /> },
  { type: 'area',    label: 'Área',      icon: <Activity    size={18} /> },
  { type: 'pie',     label: 'Pizza',     icon: <PieChart    size={18} /> },
  { type: 'scatter', label: 'Dispersão', icon: <Crosshair   size={18} /> },
  { type: 'radar',   label: 'Radar',     icon: <Hexagon     size={18} /> },
  { type: 'funnel',  label: 'Funil',     icon: <Filter      size={18} /> },
  { type: 'table',   label: 'Tabela',    icon: <Table       size={18} /> },
  { type: 'kpi',     label: 'KPI',       icon: <Target      size={18} /> },
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
  cumulative_count: 'Cont. Cumulativa',
  cumulative_sum: 'Soma Cumulativa',
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
    // Campos numéricos/moeda incluem ambas as cumulativas no ciclo
    const cycle: AggregationType[] = ['count', 'distinct_count', 'sum', 'avg', 'cumulative_count', 'cumulative_sum'];
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
 * em tempo real via `onLiveChange` a cada alteração (sem debounce local).
 * O pai (Reports.tsx) é responsável por aplicar debounce apenas na chamada à API.
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
  /** Campo de divisão de séries — só válido para bar/line */
  const [splitByField, setSplitByField] = useState<AxisField | null>(null);
  /**
   * Valores raw selecionados para filtrar as séries do split_by.
   * Vazio = exibe todas as séries. Preenchido = exibe apenas as selecionadas.
   */
  const [splitFilterValues, setSplitFilterValues] = useState<(string | number)[]>([]);
  /** Valores disponíveis para o campo split_by atual (buscados da API). */
  const [availableSplitValues, setAvailableSplitValues] = useState<{ label: string; value: string | number }[]>([]);
  const [loadingSplitValues, setLoadingSplitValues] = useState(false);

  /**
   * Valores raw selecionados para filtrar os grupos do eixo X.
   * Só se aplica a campos categóricos (não-date).
   * Vazio = exibe todos. Preenchido = exibe apenas os selecionados.
   */
  const [xFilterValues, setXFilterValues] = useState<(string | number)[]>([]);
  /** Valores disponíveis para o filtro do eixo X (buscados da API). */
  const [availableXValues, setAvailableXValues] = useState<{ label: string; value: string | number }[]>([]);
  const [loadingXValues, setLoadingXValues] = useState(false);

  /** Estado visual das zonas de drop */
  const [xDropState, setXDropState] = useState<DropState>('idle');
  const [yDropState, setYDropState] = useState<DropState>('idle');
  const [splitDropState, setSplitDropState] = useState<DropState>('idle');

  /**
   * ID estável do gráfico atual.
   * Ao criar novo, gerado uma única vez por "sessão de criação".
   * Ao editar, assume o ID do gráfico existente.
   */
  const [currentChartId, setCurrentChartId] = useState<string>(() => crypto.randomUUID());

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
      setChartType(editingConfig.type);
      setXAxisField(editingConfig.x_field);
      setXGroupBy(editingConfig.x_group_by || 'month');
      setYFields(editingConfig.y_fields);
      setPeriod(editingConfig.period);
      setStartDate(editingConfig.start_date || '');
      setEndDate(editingConfig.end_date || '');
      setSplitByField(editingConfig.split_by ?? null);
      setSplitFilterValues(editingConfig.split_filter_values ?? []);
      setXFilterValues(editingConfig.x_filter_values ?? []);
      setCurrentChartId(editingConfig.id);
    } else {
      // Novo gráfico: reseta tudo e gera ID novo
      setTitle('Novo Gráfico');
      setChartType('bar');
      setXAxisField(null);
      setXGroupBy('month');
      setYFields([]);
      setPeriod('this_month');
      setStartDate('');
      setEndDate('');
      setSplitByField(null);
      setSplitFilterValues([]);
      setXFilterValues([]);
      setCurrentChartId(crypto.randomUUID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingConfig?.id]);

  // ========================
  // Carrega valores disponíveis do split_by
  // ========================

  /**
   * Busca os valores únicos disponíveis para o campo split_by sempre que ele muda.
   * Não reseta splitFilterValues aqui — o reset ocorre nos handlers de interação
   * (handleSplitDrop e botão de remoção) para não sobrescrever a restauração do editingConfig.
   */
  useEffect(() => {
    if (!splitByField) {
      setAvailableSplitValues([]);
      return;
    }

    setLoadingSplitValues(true);
    reportService
      .fetchSplitValues(splitByField.source, splitByField.key)
      .then((values) => setAvailableSplitValues(values))
      .catch(() => setAvailableSplitValues([]))
      .finally(() => setLoadingSplitValues(false));
  // Depende dos campos que identificam o campo split_by (não o objeto inteiro para evitar loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitByField?.source, splitByField?.key]);

  /**
   * Busca os valores disponíveis para o eixo X sempre que o campo muda.
   * Só faz sentido para campos categóricos (category/user) — datas têm infinitos valores.
   * Reutiliza o mesmo endpoint de split-values pois a query é equivalente.
   */
  useEffect(() => {
    if (!xAxisField || xAxisField.field_type === 'date') {
      setAvailableXValues([]);
      setXFilterValues([]);
      return;
    }

    setLoadingXValues(true);
    reportService
      .fetchSplitValues(xAxisField.source, xAxisField.key)
      .then((values) => setAvailableXValues(values))
      .catch(() => setAvailableXValues([]))
      .finally(() => setLoadingXValues(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xAxisField?.source, xAxisField?.key, xAxisField?.field_type]);

  // ========================
  // Atualização em tempo real
  // ========================

  /**
   * Dispara `onLiveChange` sempre que qualquer campo muda.
   * Usa `title` diretamente (sem debounce) para garantir que o valor mais recente
   * chegue ao pai imediatamente — o pai aplica debounce apenas na chamada à API.
   * Só executa quando o painel está ativo, xAxisField e pelo menos 1 campo Y foram preenchidos.
   */
  useEffect(() => {
    if (!active || !xAxisField || yFields.length === 0) return;

    const isDate = xAxisField.field_type === 'date';

    const config: ChartConfig = {
      id: currentChartId,
      type: chartType,
      title: title.trim() || 'Novo Gráfico',
      x_field: xAxisField,
      x_group_by: isDate ? xGroupBy : undefined,
      y_fields: yFields,
      period,
      start_date: period === 'custom' ? startDate : undefined,
      end_date: period === 'custom' ? endDate : undefined,
      // split_by só é incluído para bar/line; para pie/table não faz sentido
      split_by: isMultiSeriesType && splitByField ? splitByField : undefined,
      // Filtro de séries: só inclui quando split_by está ativo e há valores selecionados
      split_filter_values:
        isMultiSeriesType && splitByField && splitFilterValues.length > 0
          ? splitFilterValues
          : undefined,
      // Filtro de valores do eixo X — só para campos categóricos
      x_filter_values: xFilterValues.length > 0 ? xFilterValues : undefined,
    };

    // Notifica o pai com a config atualizada — Reports.tsx busca os dados via API
    onLiveChange(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    chartType,
    xAxisField,
    xGroupBy,
    yFields,
    period,
    startDate,
    endDate,
    splitByField,
    splitFilterValues,
    xFilterValues,
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

    // Proíbe o mesmo campo nos dois eixos (ignora campos calculados na comparação)
    const isInY = yFields.some(
      (yf) => !yf.is_calculated &&
        (yf as { field: AxisField }).field.key === field.key &&
        (yf as { field: AxisField }).field.source === field.source
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(e.dataTransfer.getData('application/json')) as Record<string, unknown>;
    } catch {
      return;
    }

    // Detecta se é um campo calculado pelo flag is_calculated
    if (parsed.is_calculated === true) {
      const calcField = parsed as { is_calculated: true; calculated_field_id: string; label: string; source: string };
      const newCalcYField: CalculatedYFieldConfig = {
        calculated_field_id: calcField.calculated_field_id,
        label: calcField.label,
        is_calculated: true,
      };

      // Tipos de série única: substitui o campo existente em vez de empilhar
      const isSingleSeries = !isMultiSeriesType;
      if (isSingleSeries) {
        setYFields([newCalcYField]);
      } else {
        setYFields((prev) => {
          if (prev.length >= 4) return prev;
          // Evita duplicata do mesmo campo calculado
          const isDuplicate = prev.some(
            (yf) => yf.is_calculated && (yf as CalculatedYFieldConfig).calculated_field_id === calcField.calculated_field_id
          );
          if (isDuplicate) return prev;
          return [...prev, newCalcYField];
        });
      }
      return;
    }

    // Campo normal: fluxo existente
    const field = parsed as unknown as AxisField;

    // Proíbe o mesmo campo nos dois eixos
    if (xAxisField && field.key === xAxisField.key && field.source === xAxisField.source) return;

    const defaultAgg = getDefaultAggregation(field);

    if (!isMultiSeriesType) {
      // Tipos de série única: drop sempre substitui — lista tem no máximo 1 item
      setYFields([{ field, aggregation: defaultAgg }]);
    } else {
      // bar/line/area: adiciona à lista até 4 campos, ignorando duplicatas
      setYFields((prev) => {
        if (prev.length >= 4) return prev;
        const isDuplicate = prev.some(
          (yf) => !yf.is_calculated && (yf as { field: AxisField }).field.key === field.key && (yf as { field: AxisField }).field.source === field.source
        );
        if (isDuplicate) return prev;
        return [...prev, { field, aggregation: defaultAgg }];
      });
    }
  };

  // ========================
  // Handlers de drag & drop — Dividir por
  // ========================

  const handleSplitDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const isGroupable = e.dataTransfer.types.includes('application/field-groupable');
    // Campo de data não é válido para split (criaria séries de datas, não categorias)
    const isDate = e.dataTransfer.types.includes('application/field-date');
    const isValid = isGroupable && !isDate;
    setSplitDropState(isValid ? 'valid' : 'invalid');
    e.dataTransfer.dropEffect = isValid ? 'copy' : 'none';
  };

  const handleSplitDragLeave = () => setSplitDropState('idle');

  const handleSplitDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSplitDropState('idle');

    let field: AxisField;
    try {
      field = JSON.parse(e.dataTransfer.getData('application/json')) as AxisField;
    } catch {
      return;
    }

    // Rejeita campos de data e não-groupable
    if (field.field_type === 'date' || !field.groupable) return;

    // Rejeita o mesmo campo do eixo X
    if (xAxisField && field.key === xAxisField.key && field.source === xAxisField.source) return;

    setSplitByField(field);
    // Reseta o filtro sempre que o usuário troca o campo split_by manualmente
    setSplitFilterValues([]);

    // Quando split_by está ativo, Y fica limitado a 1 campo (split gera as múltiplas séries)
    if (yFields.length > 1) {
      setYFields((prev) => prev.slice(0, 1));
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
   * Campos calculados não têm agregação — ignora silenciosamente.
   * - number/currency: count → distinct_count → sum → avg → count
   * - outros: count → distinct_count → count
   */
  const handleCycleAggregation = (index: number) => {
    setYFields((prev) =>
      prev.map((yf, i) => {
        if (i !== index) return yf;
        // Campos calculados não têm agregação — retorna sem modificar
        if (yf.is_calculated) return yf;
        return { ...yf, aggregation: cycleAggregation(yf.aggregation, yf.field) };
      })
    );
  };

  // ========================
  // Handler do filtro de valores split_by
  // ========================

  /**
   * Alterna a inclusão de um valor no filtro de séries.
   * - splitFilterValues vazio = todos incluídos. Ao desmarcar um, os demais são adicionados ao filtro.
   * - splitFilterValues preenchido = apenas esses incluídos. Ao alternar, inclui/exclui o item.
   * - Quando todos voltam a estar incluídos, o filtro é resetado para vazio (sem filtro explícito).
   */
  const toggleSplitFilterValue = (rawValue: string | number) => {
    const strValue = String(rawValue);
    const allStrValues = new Set(availableSplitValues.map((v) => String(v.value)));

    // Determina o conjunto atual de valores incluídos
    const currentIncluded: Set<string> =
      splitFilterValues.length === 0
        ? new Set(allStrValues)
        : new Set(splitFilterValues.map((v) => String(v)));

    // Alterna o valor clicado
    if (currentIncluded.has(strValue)) {
      currentIncluded.delete(strValue);
    } else {
      currentIncluded.add(strValue);
    }

    // Se todos estão incluídos → reseta (sem filtro explícito)
    const allIncluded = [...allStrValues].every((v) => currentIncluded.has(v));
    if (allIncluded) {
      setSplitFilterValues([]);
    } else {
      // Reconstrói a lista a partir dos valores disponíveis (preserva tipo original int/str)
      const newFilter = availableSplitValues
        .filter((item) => currentIncluded.has(String(item.value)))
        .map((item) => item.value);
      setSplitFilterValues(newFilter);
    }
  };

  /**
   * Alterna a inclusão de um valor no filtro do eixo X.
   * Mesma lógica do toggleSplitFilterValue — vazio = todos incluídos.
   */
  const toggleXFilterValue = (rawValue: string | number) => {
    const strValue = String(rawValue);
    const allStrValues = new Set(availableXValues.map((v) => String(v.value)));
    const currentIncluded = new Set(
      xFilterValues.length === 0
        ? [...allStrValues]
        : xFilterValues.map(String)
    );

    if (currentIncluded.has(strValue)) {
      currentIncluded.delete(strValue);
    } else {
      currentIncluded.add(strValue);
    }

    const allIncluded = [...allStrValues].every((v) => currentIncluded.has(v));
    if (allIncluded) {
      setXFilterValues([]);
    } else {
      const newFilter = availableXValues
        .filter((item) => currentIncluded.has(String(item.value)))
        .map((item) => item.value);
      setXFilterValues(newFilter);
    }
  };

  // ========================
  // Campos derivados
  // ========================

  const xFieldIsDate = xAxisField?.field_type === 'date';

  // area e bar_horizontal se comportam igual a bar/line: suporta múltiplas séries e split_by
  const isMultiSeriesType = chartType === 'bar' || chartType === 'bar_horizontal' || chartType === 'line' || chartType === 'area';

  /**
   * Determina se a zona dashed de drop Y deve ser exibida.
   * - Com split_by ativo: Y fica limitado a 1 (split cria as séries)
   * - bar/line sem split_by: visível quando há menos de 4 campos Y
   * - pie/table: sempre visível (drop substitui o campo existente)
   */
  const splitIsActive = isMultiSeriesType && splitByField !== null;
  const canReceiveMoreY = splitIsActive
    ? yFields.length < 1
    : isMultiSeriesType
      ? yFields.length < 4
      : true;

  // ========================
  // Estado idle
  // ========================

  if (!active) {
    return (
      <aside className="flex h-full w-80 shrink-0 flex-col items-center justify-center overflow-y-auto border-l border-gray-200 bg-white p-6 text-center dark:border-slate-700/50 dark:bg-slate-900">
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
          <div title={`${xAxisField.label} · ${DATA_SOURCE_LABELS[xAxisField.source]}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
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
   * - Um chip por campo Y (ponto colorido para bar/line, badge de agregação clicável, botão ×)
   * - Zona dashed de drop abaixo (sempre visível para pie/table, visível para bar/line < 4)
   * - Aviso de limite atingido para bar/line com 4 campos
   */
  const renderYDropZone = () => {
    const yBorderClass =
      yDropState === 'valid'
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
        : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800/50';

    const maxLabel = splitIsActive ? '(1 campo)' : isMultiSeriesType ? '(máx. 4)' : '(1 campo)';

    // Texto de hint da zona dashed conforme o contexto
    const dropHint =
      yFields.length === 0
        ? 'Arraste qualquer campo aqui'
        : !isMultiSeriesType
          ? 'Arraste para substituir'
          : splitIsActive
            ? 'Arraste para substituir'
            : 'Arraste outro campo para comparar';

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
                key={yf.is_calculated
                  ? `calc-${(yf as CalculatedYFieldConfig).calculated_field_id}-${index}`
                  : `${(yf as { field: AxisField }).field.source}-${(yf as { field: AxisField }).field.key}-${index}`
                }
                title={yf.is_calculated
                  ? (yf as CalculatedYFieldConfig).label
                  : `${(yf as { field: AxisField }).field.label} · ${DATA_SOURCE_LABELS[(yf as { field: AxisField }).field.source]} · ${AGGREGATION_LABELS[(yf as { aggregation: AggregationType }).aggregation]}`
                }
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                {/*
                  Ponto colorido para bar/line — corresponde à cor da série no gráfico.
                  Para pie/table (1 campo), não exibe pois não há múltiplas séries.
                */}
                {isMultiSeriesType && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
                  />
                )}

                {yf.is_calculated ? (
                  // Chip de campo calculado — exibe badge "fx" azul em vez de ícone de tipo
                  <>
                    <span className="shrink-0 font-mono text-xs font-bold text-blue-500 dark:text-blue-400">
                      fx
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                      {(yf as CalculatedYFieldConfig).label}
                    </span>
                    {/* Badge que identifica o campo como calculado */}
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      Calculado
                    </span>
                  </>
                ) : (
                  // Chip de campo normal — exibe ícone de tipo + badge de agregação clicável
                  <>
                    <FieldTypeIcon fieldType={(yf as { field: AxisField }).field.field_type} size={13} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                      {(yf as { field: AxisField }).field.label}
                    </span>
                    {/* Badge da fonte de dados */}
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {DATA_SOURCE_LABELS[(yf as { field: AxisField }).field.source]}
                    </span>
                    {/* Badge de agregação — clicável, cicla pelas opções disponíveis */}
                    <button
                      type="button"
                      onClick={() => handleCycleAggregation(index)}
                      title="Clique para mudar a agregação"
                      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                    >
                      {AGGREGATION_LABELS[(yf as { aggregation: AggregationType }).aggregation]}
                    </button>
                  </>
                )}

                {/* Botão de remoção — igual para ambos os tipos */}
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

        {/* Zona dashed de drop */}
        {canReceiveMoreY ? (
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
                <span className="text-slate-400 dark:text-slate-500">{dropHint}</span>
              </>
            )}
          </div>
        ) : (
          /* Limite atingido — por split_by ativo (1) ou por 4 séries */
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {splitIsActive
              ? 'Remova o "Dividir por" para adicionar mais métricas'
              : 'Limite de 4 métricas atingido'}
          </p>
        )}
      </div>
    );
  };

  // ========================
  // Formulário
  // ========================

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900">
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
          <div className="grid grid-cols-5 gap-1.5">
            {CHART_TYPE_OPTIONS.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                title={label}
                onClick={() => {
                  setChartType(type);
                  // Tipos de série única só aceitam 1 métrica — descarta as extras e o split_by
                  const willBeSingleSeries = type !== 'bar' && type !== 'bar_horizontal' && type !== 'line' && type !== 'area';
                  if (willBeSingleSeries) {
                    if (yFields.length > 1) setYFields((prev) => prev.slice(0, 1));
                    setSplitByField(null);
                  }
                }}
                className={`flex items-center justify-center rounded-lg border p-2.5 transition-colors ${
                  chartType === type
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-gray-200 bg-white text-slate-500 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {icon}
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

        {/* Filtro de valores do eixo X — visível quando X é um campo categórico e há valores disponíveis */}
        {xAxisField && xAxisField.field_type !== 'date' && (availableXValues.length > 0 || loadingXValues) && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <ListFilter size={12} />
                Filtrar valores do Eixo X
              </label>
              {xFilterValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => setXFilterValues([])}
                  className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Exibir todos
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
              {loadingXValues ? (
                <p className="py-1 text-center text-xs text-slate-400 dark:text-slate-500">
                  Carregando...
                </p>
              ) : (
                <div className="space-y-1">
                  {availableXValues.map(({ label, value }) => {
                    const isChecked =
                      xFilterValues.length === 0 ||
                      xFilterValues.some((v) => String(v) === String(value));

                    return (
                      <label
                        key={String(value)}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleXFilterValue(value)}
                          className="h-3 w-3 rounded border-gray-300 accent-emerald-600 dark:border-slate-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {xFilterValues.length > 0 && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                {xFilterValues.length} de {availableXValues.length} valores exibidos
              </p>
            )}
          </div>
        )}

        {/* Dividir por — apenas para bar/line; gera uma série por valor da dimensão */}
        {isMultiSeriesType && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Dividir por{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>

            {splitByField ? (
              // Campo preenchido — chip com botão de remoção
              <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-700/50 dark:bg-violet-900/20">
                <FieldTypeIcon fieldType={splitByField.field_type} size={13} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-violet-700 dark:text-violet-300">
                  {splitByField.label}
                </span>
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-500 dark:bg-violet-800/50 dark:text-violet-400">
                  {DATA_SOURCE_LABELS[splitByField.source]}
                </span>
                <button
                  type="button"
                  onClick={() => { setSplitByField(null); setSplitFilterValues([]); }}
                  title="Remover divisão"
                  className="shrink-0 rounded p-0.5 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-800/50"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              // Zona vazia — aceita drop de campos groupable não-date
              <div
                onDragOver={handleSplitDragOver}
                onDragLeave={handleSplitDragLeave}
                onDrop={handleSplitDrop}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-xs transition-colors ${
                  splitDropState === 'valid'
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                    : splitDropState === 'invalid'
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800/50'
                }`}
              >
                {splitDropState === 'invalid' ? (
                  <span className="text-red-500 dark:text-red-400">
                    Apenas campos categóricos
                  </span>
                ) : splitDropState === 'valid' ? (
                  <span className="text-violet-600 dark:text-violet-400">Solte aqui</span>
                ) : (
                  <>
                    <GripVertical size={13} className="text-slate-300 dark:text-slate-600" />
                    <span className="text-slate-400 dark:text-slate-500">
                      Ex: Vendedor, Canal, Status
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Aviso quando split_by está ativo */}
            {splitByField && (
              <p className="mt-1.5 text-xs text-violet-500 dark:text-violet-400">
                O gráfico exibirá uma série por valor de "{splitByField.label}"
              </p>
            )}

            {/* Filtro de séries — exibido quando split_by está ativo e há valores disponíveis */}
            {splitByField && (availableSplitValues.length > 0 || loadingSplitValues) && (
              <div className="mt-3">
                {/* Cabeçalho do filtro */}
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <ListFilter size={12} />
                    Filtrar séries exibidas
                  </label>
                  {splitFilterValues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSplitFilterValues([])}
                      className="text-xs text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      Exibir todas
                    </button>
                  )}
                </div>

                {/* Lista de checkboxes */}
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                  {loadingSplitValues ? (
                    <p className="py-1 text-center text-xs text-slate-400 dark:text-slate-500">
                      Carregando...
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {availableSplitValues.map(({ label, value }) => {
                        const isChecked =
                          splitFilterValues.length === 0 ||
                          splitFilterValues.some((v) => String(v) === String(value));

                        return (
                          <label
                            key={String(value)}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSplitFilterValue(value)}
                              className="h-3 w-3 rounded border-gray-300 accent-violet-600 dark:border-slate-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Contador de seleção */}
                {splitFilterValues.length > 0 && (
                  <p className="mt-1 text-xs text-violet-500 dark:text-violet-400">
                    {splitFilterValues.length} de {availableSplitValues.length} séries selecionadas
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
