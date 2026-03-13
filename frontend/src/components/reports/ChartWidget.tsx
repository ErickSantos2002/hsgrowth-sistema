import React from 'react';
import { RefreshCw, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  FunnelChart,
  Funnel,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { getChartColors } from '../../constants/colors';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import { ChartConfig, QueryResponse, SERIES_COLORS } from './reportTypes';

interface ChartWidgetProps {
  config: ChartConfig;
  data: QueryResponse;
  /** Indica que este gráfico está selecionado no painel de configuração */
  isSelected?: boolean;
  /** Chamado ao clicar no cabeçalho — abre a configuração no painel direito */
  onClick: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  loading?: boolean;
  /**
   * Chamado ao clicar em uma barra/fatia do gráfico para drill-down.
   * xLabel: label do eixo X da barra clicada.
   * seriesLabel: nome da série quando split_by está ativo (multi-série).
   */
  onBarClick?: (xLabel: string, seriesLabel?: string) => void;
}

/**
 * Card individual de gráfico dentro do builder de relatórios.
 *
 * Clicar no cabeçalho (título + meta) seleciona o gráfico para edição no painel direito.
 * Quando selecionado, exibe borda brilhante ao redor do card.
 *
 * Suporta multi-série em bar/line via `data.series[]` — quando presente,
 * renderiza uma barra/linha por série com cor e legenda próprias.
 */
const ChartWidget: React.FC<ChartWidgetProps> = ({
  config,
  data,
  isSelected = false,
  onClick,
  onDelete,
  onRefresh,
  loading = false,
  onBarClick,
}) => {
  const { darkMode } = useTheme();
  const chartColors = getChartColors(darkMode);

  // Detecta modo multi-série (bar/line com mais de 1 campo Y)
  const hasSeries = !!data.series && data.series.length > 1;

  /**
   * Monta o array de dados para o Recharts.
   * - Single-série: { name, valor }
   * - Multi-série: { name, [nome da série 1], [nome da série 2], ... }
   */
  const rechartData = (data.labels || []).map((label, idx) => {
    const entry: Record<string, string | number> = { name: label };
    if (hasSeries) {
      data.series!.forEach((s) => {
        entry[s.name] = s.values[idx] ?? 0;
      });
    } else {
      entry.valor = data.values?.[idx] ?? 0;
    }
    return entry;
  });

  /**
   * Formata o valor do tooltip conforme o tipo do primeiro campo Y.
   * Para valor monetário (key 'value') com agregação diferente de contagem,
   * exibe o valor formatado como moeda.
   */
  const formatTooltipValue = (value: number): string => {
    const firstYField = config.y_fields[0];
    // Campos calculados não têm .field/.aggregation — trata como número simples
    if (
      firstYField &&
      !firstYField.is_calculated &&
      (firstYField as { field: { key: string }; aggregation: string }).field.key === 'value' &&
      (firstYField as { aggregation: string }).aggregation !== 'count'
    ) {
      return formatCurrency(value);
    }
    return value.toLocaleString('pt-BR');
  };

  const axisProps = {
    tick: { fill: chartColors.content.secondary, fontSize: 11 },
    axisLine: { stroke: chartColors.border.default },
    tickLine: false,
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: chartColors.surface.elevated,
      borderColor: chartColors.border.default,
      color: chartColors.content.primary,
      borderRadius: '8px',
      fontSize: '12px',
    },
    wrapperStyle: {
      zIndex: 9999,
    },
  };

  /**
   * Tooltip customizado para BarChart:
   * Exibe o label (data) + Total somado de todas as séries no cabeçalho.
   * Abaixo mostra cada série c/ seu valor, na cor da série.
   */
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
    const formattedTotal = formatTooltipValue(total);

    return (
      <div
        style={{
          backgroundColor: chartColors.surface.elevated,
          border: `1px solid ${chartColors.border.default}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          color: chartColors.content.primary,
          zIndex: 9999,
          minWidth: 160,
        }}
      >
        {/* Cabeçalho: apenas a data */}
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {/* Linhas por série */}
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: entry.color }}>
            <span>{hasSeries ? entry.name : config.title}</span>
            <span style={{ fontWeight: 600 }}>{formatTooltipValue(Number(entry.value))}</span>
          </div>
        ))}
        {/* Total no final com separador */}
        <div style={{ borderTop: `1px solid ${chartColors.border.default}`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 16, color: darkMode ? '#ffffff' : '#0f172a', fontWeight: 700 }}>
          <span>Total</span>
          <span>{formattedTotal}</span>
        </div>
      </div>
    );
  };

  /** Renderiza o Legend com cor de texto do tema */
  const renderLegend = () => (
    <Legend
      formatter={(value) => (
        <span style={{ color: chartColors.content.secondary, fontSize: '12px' }}>{value}</span>
      )}
    />
  );

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex h-52 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      );
    }

    // KPI é tratado antes da verificação de labels — funciona com total mesmo sem série temporal
    if (config.type === 'kpi') {
      const total = data.total ?? (data.values ? data.values.reduce((a, b) => a + b, 0) : null);

      if (total === null) {
        return (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
            <BarChart3 size={32} />
            <span className="text-sm">Sem dados para exibir</span>
          </div>
        );
      }

      // Tendência: variação percentual entre o primeiro e o último valor da série
      const trendPercent =
        data.values && data.values.length >= 2 && data.values[0] !== 0
          ? ((data.values[data.values.length - 1] - data.values[0]) / data.values[0]) * 100
          : null;

      // Label da métrica principal para exibir como subtítulo
      const metricLabel =
        config.y_fields.length > 0
          ? config.y_fields[0].is_calculated
            ? (config.y_fields[0] as import('./reportTypes').CalculatedYFieldConfig).label
            : (config.y_fields[0] as { field: import('./reportTypes').AxisField }).field.label
          : null;

      return (
        <div className="flex h-52 flex-col items-center justify-center gap-3 px-6">
          {/* Valor principal em destaque */}
          <p className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatTooltipValue(total)}
          </p>

          {/* Indicador de tendência quando há dados de série */}
          {trendPercent !== null && (
            <div
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                trendPercent >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {trendPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>
                {trendPercent >= 0 ? '+' : ''}
                {trendPercent.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Subtítulo com a métrica configurada */}
          {metricLabel && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{metricLabel}</p>
          )}
        </div>
      );
    }

    if (!data.labels || data.labels.length === 0) {
      return (
        <div className="flex h-52 flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
          <BarChart3 size={32} />
          <span className="text-sm">Sem dados para exibir</span>
        </div>
      );
    }

    switch (config.type) {
      case 'bar': {
        // Chaves de dados: uma por série (multi) ou 'valor' (single)
        const barKeys = hasSeries ? data.series!.map((s) => s.name) : ['valor'];
        return (
          <ResponsiveContainer width="100%" height={hasSeries ? 240 : 220}>
            <BarChart data={rechartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip
                content={<CustomBarTooltip />}
                wrapperStyle={{ zIndex: 9999 }}
              />
              {hasSeries && renderLegend()}
              {barKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                  onClick={onBarClick
                    ? (barData) => {
                        if (barData?.name != null)
                          onBarClick(String(barData.name), hasSeries ? key : undefined);
                      }
                    : undefined}
                >
                  <LabelList
                    dataKey={key}
                    position="top"
                    style={{
                      fill: darkMode ? '#ffffff' : '#0f172a',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    formatter={(val: unknown) => {
                      const n = Number(val);
                      return n === 0 ? '' : formatTooltipValue(n);
                    }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'line': {
        const lineKeys = hasSeries ? data.series!.map((s) => s.name) : ['valor'];
        return (
          <ResponsiveContainer width="100%" height={hasSeries ? 240 : 220}>
            <LineChart
              data={rechartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
              onClick={onBarClick
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (chartData: any) => {
                    if (chartData?.activeLabel) {
                      // Em multi-série, usa a primeira série ativa; em single usa undefined
                      const seriesName: string | undefined = hasSeries
                        ? chartData.activePayload?.[0]?.name
                        : undefined;
                      onBarClick(chartData.activeLabel, seriesName);
                    }
                  }
                : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip
                content={<CustomBarTooltip />}
                wrapperStyle={{ zIndex: 9999 }}
              />
              {hasSeries && renderLegend()}
              {lineKeys.map((key, i) => {
                const color = SERIES_COLORS[i % SERIES_COLORS.length];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 4 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey={key}
                      position="top"
                      style={{
                        fill: darkMode ? '#ffffff' : '#0f172a',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      formatter={(val: unknown) => {
                        const n = Number(val);
                        return n === 0 ? '' : formatTooltipValue(n);
                      }}
                    />
                  </Line>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'pie': {
        const RADIAN = Math.PI / 180;
        const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
          if (!value || value === 0) return null;
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          return (
            <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
              {formatTooltipValue(value)}
            </text>
          );
        };
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={rechartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={88}
                dataKey="valor"
                nameKey="name"
                labelLine={false}
                label={renderPieLabel}
                style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                onClick={onBarClick
                  ? (sliceData) => onBarClick(sliceData.name)
                  : undefined}
              >
                {rechartData.map((_, index) => (
                  <Cell key={index} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomBarTooltip />}
                wrapperStyle={{ zIndex: 9999 }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: chartColors.content.secondary, fontSize: '12px' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'table':
        return (
          <div className="max-h-52 overflow-auto rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Categoria</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rechartData.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-t border-gray-100 dark:border-slate-700 ${onBarClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40' : ''}`}
                    onClick={onBarClick ? () => onBarClick(row.name as string) : undefined}
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.name}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">
                      {formatTooltipValue(row.valor as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'area': {
        // Área: idêntico ao line mas com preenchimento abaixo da curva
        const areaKeys = hasSeries ? data.series!.map((s) => s.name) : ['valor'];
        return (
          <ResponsiveContainer width="100%" height={hasSeries ? 240 : 220}>
            <AreaChart
              data={rechartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
              onClick={
                onBarClick
                  ? (chartData: any) => {
                      if (chartData?.activeLabel) {
                        const seriesName: string | undefined = hasSeries
                          ? chartData.activePayload?.[0]?.name
                          : undefined;
                        onBarClick(chartData.activeLabel, seriesName);
                      }
                    }
                  : undefined
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<CustomBarTooltip />} wrapperStyle={{ zIndex: 9999 }} />
              {hasSeries && renderLegend()}
              {areaKeys.map((key, i) => {
                const color = SERIES_COLORS[i % SERIES_COLORS.length];
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ fill: color, r: 3 }}
                    activeDot={{ r: 5 }}
                  >
                    <LabelList
                      dataKey={key}
                      position="top"
                      style={{ fill: darkMode ? '#ffffff' : '#0f172a', fontSize: 11, fontWeight: 600 }}
                      formatter={(val: unknown) => {
                        const n = Number(val);
                        return n === 0 ? '' : formatTooltipValue(n);
                      }}
                    />
                  </Area>
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      case 'scatter': {
        // Dispersão: cada categoria vira um ponto posicionado pelo seu valor
        const scatterData = (data.labels ?? []).map((label, i) => ({
          label,
          y: data.values?.[i] ?? 0,
        }));

        // Tooltip customizado para mostrar o nome da categoria + valor
        const CustomScatterTooltip = ({ active, payload }: any) => {
          if (!active || !payload || payload.length === 0) return null;
          const point = payload[0]?.payload;
          return (
            <div
              style={{
                backgroundColor: chartColors.surface.elevated,
                border: `1px solid ${chartColors.border.default}`,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: chartColors.content.primary,
              }}
            >
              <div style={{ fontWeight: 600 }}>{point?.label}</div>
              <div style={{ color: SERIES_COLORS[0], fontWeight: 600 }}>
                {formatTooltipValue(Number(point?.y))}
              </div>
            </div>
          );
        };

        return (
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border.default} />
              <XAxis
                dataKey="label"
                type="category"
                name="Categoria"
                {...axisProps}
                allowDuplicatedCategory={false}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="Valor"
                {...axisProps}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip content={<CustomScatterTooltip />} wrapperStyle={{ zIndex: 9999 }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={scatterData}
                fill={SERIES_COLORS[0]}
                style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                onClick={onBarClick ? (point: any) => onBarClick(point?.label) : undefined}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
      }

      case 'radar': {
        // Radar (aranha): cada label vira um eixo radial, o valor define a área preenchida
        return (
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={rechartData}>
              <PolarGrid stroke={chartColors.border.default} />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: chartColors.content.secondary, fontSize: 10 }}
              />
              <Radar
                name={config.title}
                dataKey="valor"
                stroke={SERIES_COLORS[0]}
                fill={SERIES_COLORS[0]}
                fillOpacity={0.35}
                strokeWidth={2}
              />
              <Tooltip content={<CustomBarTooltip />} wrapperStyle={{ zIndex: 9999 }} />
            </RadarChart>
          </ResponsiveContainer>
        );
      }

      case 'funnel': {
        // Funil: ordena do maior para o menor para manter a forma de funil
        const funnelData = [...rechartData]
          .sort((a, b) => (b.valor as number) - (a.valor as number))
          .map((row, i) => ({
            ...row,
            fill: SERIES_COLORS[i % SERIES_COLORS.length],
          }));

        return (
          <ResponsiveContainer width="100%" height={240}>
            <FunnelChart>
              <Tooltip content={<CustomBarTooltip />} wrapperStyle={{ zIndex: 9999 }} />
              <Funnel
                dataKey="valor"
                data={funnelData}
                isAnimationActive
                style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                onClick={onBarClick ? (seg: any) => onBarClick(seg?.name) : undefined}
              >
                <LabelList
                  position="right"
                  stroke="none"
                  dataKey="name"
                  style={{ fill: darkMode ? '#ffffff' : '#0f172a', fontSize: 11, fontWeight: 500 }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  const TYPE_LABELS: Record<import('./reportTypes').ChartType, string> = {
    bar: 'Barras',
    line: 'Linha',
    pie: 'Pizza',
    table: 'Tabela',
    area: 'Área',
    scatter: 'Dispersão',
    radar: 'Radar',
    funnel: 'Funil',
    kpi: 'KPI',
  };
  const typeLabel = TYPE_LABELS[config.type] ?? config.type;

  // Label do eixo Y: '—' quando vazio, label do campo quando 1, 'N métricas' quando múltiplos
  const yLabel =
    config.y_fields.length === 0 ? '—'
    : config.y_fields.length === 1
      ? (config.y_fields[0].is_calculated
          ? (config.y_fields[0] as import('./reportTypes').CalculatedYFieldConfig).label
          : (config.y_fields[0] as { field: import('./reportTypes').AxisField }).field.label)
      : `${config.y_fields.length} métricas`;

  const chartMeta = `${typeLabel} • ${config.x_field?.label ?? '—'} / ${yLabel}`;

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white transition-all duration-200 dark:bg-slate-800/50 ${
        isSelected
          ? 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)] dark:border-emerald-400 dark:shadow-[0_0_0_3px_rgba(52,211,153,0.2)]'
          : 'border-gray-200 dark:border-slate-700'
      }`}
    >
      {/* Cabeçalho — clicável para selecionar o gráfico */}
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={onClick}
          title="Clique para editar este gráfico"
          className="min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40"
        >
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {config.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{chartMeta}</p>
        </button>

        {/* Botões de ação — stopPropagation garante que não ativam o onClick do cabeçalho */}
        <div className="flex shrink-0 items-center gap-0.5 px-2 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            title="Atualizar dados"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Remover gráfico"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Área do gráfico */}
      <div className="p-4">{renderChart()}</div>
    </div>
  );
};

export default ChartWidget;
