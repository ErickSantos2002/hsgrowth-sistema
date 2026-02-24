/**
 * Tipos compartilhados para o módulo de Relatórios Customizados.
 *
 * Fase 1: catálogo de campos e dados mockados hardcoded no frontend.
 * Fase 2: serão substituídos por chamadas à API:
 *   - GET /api/v1/reports/fields  → FIELD_CATALOG
 *   - POST /api/v1/reports/query  → generateMockData
 *   - CRUD /api/v1/reports/custom → savedReports via localStorage
 */

import type { PeriodType } from '../../services/reportService';
import { COLORS } from '../../constants/colors';

// Re-exporta PeriodType para facilitar uso nos componentes filhos
export type { PeriodType };

// ========================
// TIPOS BÁSICOS
// ========================

export type DataSource = 'cards' | 'clients' | 'persons' | 'activities';
export type ChartType = 'bar' | 'line' | 'pie' | 'table';
export type AggregationType = 'count' | 'sum' | 'avg' | 'distinct_count';
export type GroupByType = 'day' | 'week' | 'month' | 'year';

// ========================
// CAMPOS E CATÁLOGO
// ========================

/** Definição de um campo disponível para uso nos gráficos */
export interface FieldDefinition {
  key: string;
  label: string;
  field_type: 'date' | 'currency' | 'category' | 'user' | 'number';
  /** Pode ser usado como eixo X (dimensão) */
  groupable: boolean;
  /** Pode ser usado como eixo Y (métrica agregável) */
  aggregatable: boolean;
}

/** Catálogo de campos por fonte de dados */
export type FieldCatalog = Record<DataSource, FieldDefinition[]>;

/**
 * Representa um campo já associado à sua fonte de dados.
 * Usado nos eixos X e Y do gráfico para suportar campos de fontes diferentes.
 */
export interface AxisField {
  key: string;
  label: string;
  source: DataSource;
  field_type: FieldDefinition['field_type'];
  groupable: boolean;
  aggregatable: boolean;
}

// ========================
// CONFIGURAÇÃO DE GRÁFICO
// ========================

/**
 * Um campo do eixo Y com sua própria agregação.
 * Permite múltiplas métricas no mesmo gráfico (bar/line).
 */
export interface YFieldConfig {
  field: AxisField;
  aggregation: AggregationType;
}

/** Configuração completa de um gráfico dentro de um relatório */
export interface ChartConfig {
  /** UUID gerado com crypto.randomUUID() */
  id: string;
  type: ChartType;
  title: string;
  /** Campo do eixo X — inclui fonte de dados e metadados do campo */
  x_field: AxisField | null;
  /** Agrupamento temporal — só usado quando x_field.field_type === 'date' */
  x_group_by?: GroupByType;
  /**
   * Campos do eixo Y — lista de métricas com agregação individual.
   * bar/line suportam até 4 séries; pie/table aceitam apenas 1.
   * Lista vazia significa sem métrica configurada.
   */
  y_fields: YFieldConfig[];
  period: PeriodType;
  /** Usado apenas quando period === 'custom' */
  start_date?: string;
  end_date?: string;
}

// ========================
// RESPOSTA DE QUERY
// ========================

/** Dados de uma série individual (multi-série bar/line) */
export interface SeriesData {
  /** Label da série — geralmente o label do campo Y */
  name: string;
  /** Valores alinhados com o array labels[] da QueryResponse */
  values: number[];
}

/**
 * Resposta de uma query de dados.
 * Para bar/line/pie: labels + values (single-série) ou labels + series (multi-série).
 * Para table: columns + rows.
 */
export interface QueryResponse {
  labels?: string[];
  /** Valores para single-série — mantido por compatibilidade com pie/table */
  values?: number[];
  /** Séries múltiplas para bar/line com mais de 1 campo Y */
  series?: SeriesData[];
  columns?: string[];
  rows?: Record<string, string | number | boolean | null>[];
  total?: number;
}

// ========================
// RELATÓRIOS SALVOS
// ========================

/** Configuração de um relatório customizado (grupo de gráficos) */
export interface CustomReportConfig {
  /** ID numérico — undefined para relatórios ainda não salvos */
  id?: number;
  name: string;
  charts: ChartConfig[];
  /** Fontes de dados permitidas neste relatório — definidas na criação */
  allowed_sources: DataSource[];
}

/** Relatório salvo na lista (com metadados para exibição) */
export interface SavedReport {
  id: number;
  name: string;
  created_by_name: string;
  updated_at: string;
  charts_count: number;
  config: CustomReportConfig;
}

// ========================
// CONSTANTES
// ========================

/**
 * Catálogo de campos disponíveis por fonte de dados.
 * Hardcoded no frontend — será substituído por GET /api/v1/reports/fields na Fase 2.
 */
export const FIELD_CATALOG: FieldCatalog = {
  cards: [
    { key: 'created_at', label: 'Data de Criação', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'closed_at', label: 'Data de Fechamento', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'due_date', label: 'Data Limite', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'value', label: 'Valor do Negócio', field_type: 'currency', groupable: false, aggregatable: true },
    { key: 'is_won', label: 'Status', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'acquisition_channel', label: 'Canal de Aquisição', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'deal_type', label: 'Tipo de Negócio', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'assigned_to', label: 'Vendedor', field_type: 'user', groupable: true, aggregatable: false },
    { key: 'sdr', label: 'SDR', field_type: 'user', groupable: true, aggregatable: false },
    { key: 'loss_reason', label: 'Motivo de Perda', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'count', label: 'Quantidade', field_type: 'number', groupable: false, aggregatable: true },
  ],
  clients: [
    { key: 'created_at', label: 'Data de Cadastro', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'sector', label: 'Setor', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'state', label: 'Estado (UF)', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'employee_count', label: 'Faixa de Funcionários', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'annual_revenue', label: 'Faixa de Faturamento', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'count', label: 'Quantidade', field_type: 'number', groupable: false, aggregatable: true },
  ],
  persons: [
    { key: 'created_at', label: 'Data de Cadastro', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'position', label: 'Cargo', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'area', label: 'Área/Departamento', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'count', label: 'Quantidade', field_type: 'number', groupable: false, aggregatable: true },
  ],
  activities: [
    { key: 'created_at', label: 'Data da Atividade', field_type: 'date', groupable: true, aggregatable: false },
    { key: 'activity_type', label: 'Tipo de Atividade', field_type: 'category', groupable: true, aggregatable: false },
    { key: 'user', label: 'Responsável', field_type: 'user', groupable: true, aggregatable: false },
    { key: 'count', label: 'Quantidade', field_type: 'number', groupable: false, aggregatable: true },
  ],
};

/** Rótulos legíveis para cada fonte de dados */
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  cards: 'Negócios',
  clients: 'Clientes',
  persons: 'Pessoas',
  activities: 'Atividades',
};

/**
 * Paleta de cores para séries de gráficos (bar/line multi-série).
 * Fonte única de verdade — usada tanto nos chips do ChartConfigPanel
 * quanto nas barras/linhas do ChartWidget para manter correspondência visual.
 */
export const SERIES_COLORS = [
  COLORS.board.blue,
  COLORS.board.green,
  COLORS.board.amber,
  COLORS.board.red,
  COLORS.board.purple,
  COLORS.board.pink,
  COLORS.board.gray,
] as const;

/** Opções de período para o SelectMenu */
export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'this_week', label: 'Esta Semana' },
  { value: 'last_week', label: 'Semana Passada' },
  { value: 'this_month', label: 'Este Mês' },
  { value: 'last_month', label: 'Mês Passado' },
  { value: 'this_quarter', label: 'Este Trimestre' },
  { value: 'last_quarter', label: 'Trimestre Passado' },
  { value: 'this_year', label: 'Este Ano' },
  { value: 'last_year', label: 'Ano Passado' },
  { value: 'custom', label: 'Personalizado' },
];

// ========================
// GERADOR DE DADOS MOCK
// ========================

/**
 * Gera dados mockados para pré-visualização de gráficos.
 *
 * - Single-série (yFields.length <= 1): retorna `{ labels, values, total }` para compatibilidade.
 * - Multi-série (yFields.length > 1): retorna `{ labels, series }` onde cada série tem
 *   os valores base multiplicados por um fator de escala por índice.
 *
 * Na Fase 2, será substituído por chamadas ao endpoint POST /api/v1/reports/query.
 *
 * @param x - Campo do eixo X (com fonte e metadados)
 * @param yFields - Lista de campos Y com agregação individual
 * @param xGroupBy - Agrupamento temporal (só quando x.field_type === 'date')
 */
export const generateMockData = (
  x: AxisField | null,
  yFields: YFieldConfig[],
  xGroupBy?: GroupByType
): QueryResponse => {
  const xField = x?.key;

  // Determina labels e valores base conforme o campo X
  let labels: string[];
  let baseValues: number[];
  let total: number;

  // Dados para campos de data agrupados por período
  if (xGroupBy === 'month') {
    labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    baseValues = [12, 19, 8, 25, 17, 22];
    total = 103;
  } else if (xGroupBy === 'week') {
    labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    baseValues = [5, 12, 8, 15];
    total = 40;
  } else if (xGroupBy === 'day') {
    labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    baseValues = [3, 7, 4, 9, 6, 2, 1];
    total = 32;
  } else if (xGroupBy === 'year') {
    labels = ['2022', '2023', '2024', '2025', '2026'];
    baseValues = [45, 67, 89, 112, 28];
    total = 341;
  } else {
    // Dados para campos categóricos específicos
    const mockByField: Record<string, { labels: string[]; values: number[]; total: number }> = {
      acquisition_channel: {
        labels: ['Inbound', 'Outbound', 'Indicação', 'Base', 'Evento'],
        values: [35, 28, 22, 18, 12],
        total: 115,
      },
      is_won: {
        labels: ['Aberto', 'Ganho', 'Perdido'],
        values: [45, 38, 22],
        total: 105,
      },
      deal_type: {
        labels: ['Novo', 'Expansão', 'Renovação'],
        values: [52, 31, 17],
        total: 100,
      },
      loss_reason: {
        labels: ['Preço', 'Concorrência', 'Sem fit', 'Timing', 'Sem orçamento'],
        values: [18, 12, 9, 7, 5],
        total: 51,
      },
      assigned_to: {
        labels: ['Ana Lima', 'Carlos Silva', 'Mariana Costa', 'Pedro Santos'],
        values: [28, 24, 19, 16],
        total: 87,
      },
      sdr: {
        labels: ['João Alves', 'Fernanda Reis', 'Lucas Mendes'],
        values: [42, 37, 28],
        total: 107,
      },
      sector: {
        labels: ['Tecnologia', 'Varejo', 'Saúde', 'Finanças', 'Educação'],
        values: [32, 27, 21, 18, 12],
        total: 110,
      },
      state: {
        labels: ['SP', 'RJ', 'MG', 'RS', 'PR'],
        values: [45, 28, 22, 18, 14],
        total: 127,
      },
      employee_count: {
        labels: ['1-10', '11-50', '51-200', '201-500', '500+'],
        values: [22, 38, 29, 14, 8],
        total: 111,
      },
      annual_revenue: {
        labels: ['Até 360k', '360k-1M', '1M-10M', '10M+'],
        values: [18, 32, 41, 24],
        total: 115,
      },
      position: {
        labels: ['CEO', 'Diretor', 'Gerente', 'Coordenador', 'Analista'],
        values: [15, 28, 37, 22, 18],
        total: 120,
      },
      area: {
        labels: ['Comercial', 'TI', 'Financeiro', 'RH', 'Marketing'],
        values: [38, 29, 22, 17, 14],
        total: 120,
      },
      activity_type: {
        labels: ['Ligação', 'E-mail', 'Reunião', 'WhatsApp', 'Tarefa'],
        values: [85, 67, 43, 95, 52],
        total: 342,
      },
      user: {
        labels: ['Ana Lima', 'Carlos Silva', 'Mariana Costa', 'Pedro Santos'],
        values: [92, 78, 65, 54],
        total: 289,
      },
    };

    const mock =
      xField && mockByField[xField]
        ? mockByField[xField]
        : {
            labels: ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'],
            values: [25, 40, 18, 32],
            total: 115,
          };

    labels = mock.labels;
    baseValues = mock.values;
    total = mock.total;
  }

  // Multi-série: cada campo Y vira uma série com fator de escala próprio
  if (yFields.length > 1) {
    // Fatores de escala para diferenciar visualmente as séries no mock
    const seriesFactors = [1.0, 0.65, 1.35, 0.8];

    // Detecta labels duplicados — quando há colisão, inclui a fonte no nome
    // para garantir chaves únicas no rechartData (ex: "Quantidade (Negócios)")
    const allLabels = yFields.map((yf) => yf.field.label);
    const hasDuplicateLabels = allLabels.length !== new Set(allLabels).size;

    return {
      labels,
      series: yFields.map((yf, i) => ({
        name: hasDuplicateLabels
          ? `${yf.field.label} (${DATA_SOURCE_LABELS[yf.field.source]})`
          : yf.field.label,
        values: baseValues.map((v) => Math.round(v * (seriesFactors[i] ?? 1.0))),
      })),
    };
  }

  // Single-série ou sem campo Y: retorna values normal (compatibilidade com pie/table)
  return { labels, values: baseValues, total };
};
