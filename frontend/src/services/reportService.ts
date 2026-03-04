import api from "./api";
import type {
  FieldCatalog,
  ChartConfig,
  QueryResponse,
  CustomReportConfig,
  SavedReport,
  DrillDownResponse,
} from "../components/reports/reportTypes";

/**
 * Enums e Types para Relatórios
 */
export type PeriodType =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export type ExportFormat = "csv" | "excel" | "json";

/**
 * Interfaces de Request
 */
export interface SalesReportRequest {
  board_id?: number;
  period: PeriodType;
  start_date?: string; // ISO format YYYY-MM-DD
  end_date?: string; // ISO format YYYY-MM-DD
  user_id?: number;
}

export interface ConversionReportRequest {
  board_id: number;
  period: PeriodType;
  start_date?: string;
  end_date?: string;
}

export interface TransferReportRequest {
  period: PeriodType;
  start_date?: string;
  end_date?: string;
  from_user_id?: number;
  to_user_id?: number;
}

export interface ExportReportRequest {
  report_type: "sales" | "conversion" | "transfers";
  format: ExportFormat;
  board_id?: number;
  period: PeriodType;
  start_date?: string;
  end_date?: string;
  user_id?: number;
}

/**
 * Interfaces de Response
 */
export interface SalesReportDetail {
  user_name?: string;
  period?: string;
  cards_created: number;
  cards_won: number;
  cards_lost: number;
  value_won: number;
  conversion_rate: number;
}

export interface SalesReportSummary {
  total_cards_created: number;
  total_cards_won: number;
  total_cards_lost: number;
  total_value_won: number;
  conversion_rate: number;
}

export interface SalesReportResponse {
  summary: SalesReportSummary;
  details: SalesReportDetail[];
}

export interface ConversionFunnelStage {
  stage_name: string;
  card_count: number;
  total_value: number;
  conversion_rate: number;
  avg_time_in_stage: number | null;
}

export interface ConversionReportSummary {
  total_cards: number;
  total_value: number;
  overall_conversion_rate: number;
}

export interface ConversionReportResponse {
  summary: ConversionReportSummary;
  stages: ConversionFunnelStage[];
}

export interface TransferReportDetail {
  from_user_name: string;
  to_user_name: string;
  transfer_count: number;
  cards_won_count: number;
  total_value_won: number;
  avg_days_to_won: number | null;
}

export interface TransferReportSummary {
  total_transfers: number;
  total_cards_won_after_transfer: number;
  total_value_won_after_transfer: number;
  avg_days_to_won: number;
}

export interface TransferReportResponse {
  summary: TransferReportSummary;
  details: TransferReportDetail[];
}

export interface ExportReportResponse {
  file_url: string;
  file_name: string;
  format: string;
  expires_at: string;
}

/**
 * Serviço de Relatórios
 * Gerencia chamadas para endpoints de relatórios
 */
class ReportService {
  /**
   * Busca KPIs do dashboard
   * (Mantido para compatibilidade com Dashboard.tsx existente)
   */
  async getDashboardKPIs(
    period?: "today" | "week" | "month" | "quarter" | "year",
    board_id?: number
  ): Promise<any> {
    const params: Record<string, any> = {};
    if (period) params.period = period;
    if (board_id) params.board_id = board_id;

    const response = await api.get("/api/v1/reports/dashboard", { params });
    return response.data;
  }

  /**
   * Gera relatório de vendas
   */
  async getSalesReport(
    request: SalesReportRequest
  ): Promise<SalesReportResponse> {
    const response = await api.post<SalesReportResponse>(
      "/api/v1/reports/sales",
      request
    );
    return response.data;
  }

  /**
   * Gera relatório de conversão (funil)
   */
  async getConversionReport(
    request: ConversionReportRequest
  ): Promise<ConversionReportResponse> {
    const response = await api.post<ConversionReportResponse>(
      "/api/v1/reports/conversion",
      request
    );
    return response.data;
  }

  /**
   * Gera relatório de transferências
   */
  async getTransferReport(
    request: TransferReportRequest
  ): Promise<TransferReportResponse> {
    const response = await api.post<TransferReportResponse>(
      "/api/v1/reports/transfers",
      request
    );
    return response.data;
  }

  /**
   * Exporta um relatório
   * Nota: Backend retorna mock por enquanto
   */
  async exportReport(
    request: ExportReportRequest
  ): Promise<ExportReportResponse> {
    const response = await api.post<ExportReportResponse>(
      "/api/v1/reports/export",
      request
    );
    return response.data;
  }

  // ========================
  // Relatórios Customizados (Fase 2)
  // ========================

  /**
   * Busca o catálogo de campos disponíveis por fonte de dados.
   * Substitui o FIELD_CATALOG hardcoded do frontend.
   */
  async fetchReportFields(): Promise<FieldCatalog> {
    const response = await api.get<FieldCatalog>("/api/v1/reports/fields");
    return response.data;
  }

  /**
   * Executa a query de um gráfico customizado e retorna os dados para renderização.
   * Substitui o generateMockData do frontend.
   */
  async queryChart(config: ChartConfig): Promise<QueryResponse> {
    // Converte o ChartConfig do frontend para o formato esperado pelo backend
    const payload = {
      x_field: config.x_field,
      x_group_by: config.x_group_by ?? null,
      y_fields: config.y_fields,
      period: config.period,
      start_date: config.start_date ?? null,
      end_date: config.end_date ?? null,
      split_by: config.split_by ?? null,
    };
    const response = await api.post<QueryResponse>("/api/v1/reports/query", payload);
    return response.data;
  }

  /**
   * Lista todos os relatórios customizados salvos.
   * Substitui o localStorage.getItem da Fase 1.
   */
  async listCustomReports(): Promise<SavedReport[]> {
    const response = await api.get<SavedReport[]>("/api/v1/reports/custom");
    return response.data;
  }

  /**
   * Cria um novo relatório customizado.
   */
  async createCustomReport(config: CustomReportConfig): Promise<SavedReport> {
    const payload = { name: config.name, config };
    const response = await api.post<SavedReport>("/api/v1/reports/custom", payload);
    return response.data;
  }

  /**
   * Atualiza um relatório customizado existente.
   */
  async updateCustomReport(id: number, config: CustomReportConfig): Promise<SavedReport> {
    const payload = { name: config.name, config };
    const response = await api.put<SavedReport>(`/api/v1/reports/custom/${id}`, payload);
    return response.data;
  }

  /**
   * Exclui um relatório customizado pelo ID.
   */
  async deleteCustomReport(id: number): Promise<void> {
    await api.delete(`/api/v1/reports/custom/${id}`);
  }

  /**
   * Busca os cards que compõem uma barra/fatia específica do gráfico (drill-down).
   * xLabel: o label do eixo X da barra clicada (ex: "Prospecção", "Jan/25").
   * splitLabel: nome da série clicada quando o gráfico usa split_by.
   */
  async drillDown(
    config: ChartConfig,
    xLabel: string,
    splitLabel?: string
  ): Promise<DrillDownResponse> {
    // Envia o y_field principal para que o backend replique o filtro implícito
    // da agregação (ex: won_count → is_won=1, meeting_count → task_type=meeting).
    // Sem isso, o drill-down mostraria todos os cards do grupo, não apenas os que
    // contribuíram para o valor exibido no gráfico.
    const primaryYField = config.y_fields[0] ?? null;

    const payload = {
      x_field: config.x_field,
      x_group_by: config.x_group_by ?? null,
      period: config.period,
      start_date: config.start_date ?? null,
      end_date: config.end_date ?? null,
      x_label: xLabel,
      split_by: config.split_by ?? null,
      split_label: splitLabel ?? null,
      y_source: primaryYField?.field.source ?? null,
      y_key: primaryYField?.field.key ?? null,
    };
    const response = await api.post<DrillDownResponse>("/api/v1/reports/drill-down", payload);
    return response.data;
  }

  /**
   * Formata nome do período para exibição
   */
  formatPeriod(period: PeriodType): string {
    const periods: Record<PeriodType, string> = {
      today: "Hoje",
      yesterday: "Ontem",
      this_week: "Esta Semana",
      last_week: "Semana Passada",
      this_month: "Este Mês",
      last_month: "Mês Passado",
      this_quarter: "Este Trimestre",
      last_quarter: "Trimestre Passado",
      this_year: "Este Ano",
      last_year: "Ano Passado",
      custom: "Período Customizado",
    };
    return periods[period] || period;
  }

  /**
   * Formata valor monetário
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  /**
   * Formata percentual
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  /**
   * Formata data
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR").format(date);
  }
}

export default new ReportService();
