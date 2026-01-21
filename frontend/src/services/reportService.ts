import api from "./api";

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
export interface SalesReportItem {
  label: string;
  new_cards: number;
  won_cards: number;
  lost_cards: number;
  won_value: number;
  conversion_rate: number;
}

export interface SalesReportResponse {
  period: string;
  start_date: string;
  end_date: string;
  total_new_cards: number;
  total_won_cards: number;
  total_lost_cards: number;
  total_won_value: number;
  overall_conversion_rate: number;
  items: SalesReportItem[];
}

export interface ConversionFunnelStage {
  list_name: string;
  list_id: number;
  cards_count: number;
  total_value: number;
  conversion_rate: number;
  avg_time_in_stage_days: number | null;
}

export interface ConversionReportResponse {
  board_name: string;
  period: string;
  start_date: string;
  end_date: string;
  total_cards: number;
  total_value: number;
  overall_conversion_rate: number;
  stages: ConversionFunnelStage[];
}

export interface TransferReportItem {
  from_user_name: string;
  to_user_name: string;
  transfers_count: number;
  cards_won_count: number;
  total_won_value: number;
  avg_days_to_win: number | null;
}

export interface TransferReportResponse {
  period: string;
  start_date: string;
  end_date: string;
  total_transfers: number;
  total_cards_won: number;
  total_won_value: number;
  items: TransferReportItem[];
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
