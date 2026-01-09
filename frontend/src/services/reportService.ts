import api from "./api";
import {
  DashboardKPIs,
  SalesReport,
  ConversionReport,
} from "../types";

/**
 * Serviço de relatórios e dashboard
 * Gerencia busca de KPIs, relatórios de vendas e conversão
 */
class ReportService {
  /**
   * Busca KPIs do dashboard
   * @param period - Período para filtrar (opcional): today, week, month, quarter, year
   * @param board_id - ID do board para filtrar (opcional)
   */
  async getDashboardKPIs(
    period?: "today" | "week" | "month" | "quarter" | "year",
    board_id?: number
  ): Promise<DashboardKPIs> {
    const params: Record<string, any> = {};

    if (period) params.period = period;
    if (board_id) params.board_id = board_id;

    const response = await api.get<DashboardKPIs>("/api/v1/reports/dashboard", {
      params,
    });

    return response.data;
  }

  /**
   * Busca relatório de vendas
   * @param period_start - Data de início (YYYY-MM-DD)
   * @param period_end - Data de fim (YYYY-MM-DD)
   * @param board_id - ID do board para filtrar (opcional)
   * @param user_id - ID do usuário para filtrar (opcional)
   */
  async getSalesReport(params: {
    period_start: string;
    period_end: string;
    board_id?: number;
    user_id?: number;
  }): Promise<SalesReport> {
    const response = await api.get<SalesReport>("/api/v1/reports/sales", {
      params,
    });

    return response.data;
  }

  /**
   * Busca relatório de conversão (funil)
   * @param board_id - ID do board (obrigatório)
   * @param period_start - Data de início (opcional)
   * @param period_end - Data de fim (opcional)
   */
  async getConversionReport(params: {
    board_id: number;
    period_start?: string;
    period_end?: string;
  }): Promise<ConversionReport> {
    const response = await api.get<ConversionReport>("/api/v1/reports/conversion", {
      params,
    });

    return response.data;
  }
}

export default new ReportService();
