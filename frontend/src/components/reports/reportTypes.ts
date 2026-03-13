/**
 * Tipos compartilhados para o módulo de Relatórios Customizados.
 *
 * Fase 2: integração completa com a API:
 *   - GET /api/v1/reports/fields  → catálogo de campos
 *   - POST /api/v1/reports/query  → dados reais do banco
 *   - CRUD /api/v1/reports/custom → persistência em PostgreSQL
 */

import type { PeriodType } from '../../services/reportService';
import { COLORS } from '../../constants/colors';

// Re-exporta PeriodType para facilitar uso nos componentes filhos
export type { PeriodType };

// ========================
// TIPOS BÁSICOS
// ========================

export type DataSource = 'cards' | 'clients' | 'persons' | 'activities' | 'tasks';
export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'area' | 'scatter' | 'radar' | 'funnel' | 'kpi';
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
// CAMPOS CALCULADOS (DAX-like)
// ========================

/**
 * Definição de um campo calculado via fórmula aritmética.
 * A fórmula referencia campos existentes com a sintaxe [field_key].
 * Ex: "[won_count] / [count] * 100" → Taxa de Conversão (%)
 */
export interface CalculatedField {
  /** UUID gerado com crypto.randomUUID() */
  id: string;
  name: string;
  /** Fórmula aritmética com referências [field_key] */
  formula: string;
  /** Fonte de dados — todos os campos da fórmula devem ser da mesma fonte */
  source: DataSource;
  field_type: 'number' | 'currency';
}

/**
 * Campo calculado posicionado no eixo Y de um gráfico.
 * Não possui agregação — o valor já é calculado pela fórmula.
 */
export interface CalculatedYFieldConfig {
  calculated_field_id: string;
  /** Label exibido na legenda do gráfico (geralmente o nome do campo calculado) */
  label: string;
  is_calculated: true;
}

// ========================
// CONFIGURAÇÃO DE GRÁFICO
// ========================

/**
 * Um campo do eixo Y — pode ser um campo normal com agregação
 * ou um campo calculado via fórmula DAX-like.
 *
 * Discriminante: is_calculated (true = calculado, false/ausente = normal)
 */
export type YFieldConfig =
  | { field: AxisField; aggregation: AggregationType; is_calculated?: false }
  | CalculatedYFieldConfig;

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
  /**
   * Dimensão categórica para dividir as séries automaticamente.
   * Ex: X=Data, Y=Quantidade, split_by=Vendedor → uma série por vendedor.
   * Disponível apenas para bar/line; desativa múltiplos campos Y.
   */
  split_by?: AxisField;
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
// DRILL-DOWN
// ========================

/** Card retornado pelo drill-down ao clicar em uma barra/fatia do gráfico */
export interface DrillDownCard {
  id: number;
  title: string;
  list_name: string;
  board_name: string;
  assigned_to_name: string | null;
  value: number | null;
  created_at: string;
  status: 'Aberto' | 'Ganho' | 'Perdido';
}

export interface DrillDownResponse {
  cards: DrillDownCard[];
  total: number;
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
  /** Campos calculados definidos no relatório — compartilhados por todos os gráficos */
  calculated_fields?: CalculatedField[];
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

// FIELD_CATALOG removido na Fase 2 — agora vem de GET /api/v1/reports/fields

/** Rótulos legíveis para cada fonte de dados */
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  cards: 'Negócios',
  clients: 'Clientes',
  persons: 'Pessoas',
  activities: 'Atividades',
  tasks: 'Tarefas',
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

// generateMockData removida na Fase 2 — dados reais vêm de POST /api/v1/reports/query
