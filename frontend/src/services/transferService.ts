/**
 * Transfer Service - Serviço para gerenciamento de transferências de cards
 * Responsável por operações de transferência e aprovação de cards entre usuários
 */
import api from "./api";
import {
  CardTransferCreate,
  BatchTransferCreate,
  CardTransferResponse,
  BatchTransferResponse,
  CardTransferListResponse,
  TransferApprovalListResponse,
  TransferApprovalDecision,
  TransferApprovalResponse,
  TransferStatistics,
} from "../types";

/**
 * Serviço de Transferências
 */
class TransferService {
  /**
   * Cria uma nova transferência de card
   * @param data Dados da transferência
   * @returns Transfer criado com mensagem de sucesso
   */
  async createTransfer(data: CardTransferCreate): Promise<CardTransferResponse> {
    const response = await api.post<CardTransferResponse>("/api/v1/transfers", data);
    return response.data;
  }

  /**
   * Cria transferência em lote (batch) - até 50 cards
   * @param data Dados da transferência em lote
   * @returns Transfers criados com total transferido
   */
  async createBatchTransfer(data: BatchTransferCreate): Promise<BatchTransferResponse> {
    const response = await api.post<BatchTransferResponse>("/api/v1/transfers/batch", data);
    return response.data;
  }

  /**
   * Lista transferências enviadas pelo usuário logado
   * @param page Número da página (default: 1)
   * @param pageSize Tamanho da página (default: 20)
   * @returns Lista paginada de transferências enviadas
   */
  async getSentTransfers(page: number = 1, pageSize: number = 20): Promise<CardTransferListResponse> {
    const response = await api.get<CardTransferListResponse>("/api/v1/transfers/sent", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  /**
   * Lista transferências recebidas pelo usuário logado
   * @param page Número da página (default: 1)
   * @param pageSize Tamanho da página (default: 20)
   * @returns Lista paginada de transferências recebidas
   */
  async getReceivedTransfers(page: number = 1, pageSize: number = 20): Promise<CardTransferListResponse> {
    const response = await api.get<CardTransferListResponse>("/api/v1/transfers/received", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  /**
   * Lista TODAS as transferências do sistema (Admin/Gerente apenas)
   * @param page Número da página (default: 1)
   * @param pageSize Tamanho da página (default: 50)
   * @returns Lista paginada de todas as transferências
   */
  async getAllTransfers(page: number = 1, pageSize: number = 50): Promise<CardTransferListResponse> {
    const response = await api.get<CardTransferListResponse>("/api/v1/transfers/all", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  /**
   * Lista aprovações pendentes do usuário logado
   * Retorna transferências que estão aguardando aprovação
   * @param page Número da página (default: 1)
   * @param pageSize Tamanho da página (default: 20)
   * @returns Lista paginada de aprovações pendentes
   */
  async getPendingApprovals(page: number = 1, pageSize: number = 20): Promise<TransferApprovalListResponse> {
    const response = await api.get<TransferApprovalListResponse>("/api/v1/transfers/approvals/pending", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  /**
   * Decide sobre uma aprovação (aprovar ou rejeitar)
   * @param approvalId ID da aprovação
   * @param decision Decisão de aprovação (approve ou reject)
   * @returns Aprovação atualizada com transfer relacionado
   */
  async decideApproval(approvalId: number, decision: TransferApprovalDecision): Promise<TransferApprovalResponse> {
    const response = await api.post<TransferApprovalResponse>(
      `/api/v1/transfers/approvals/${approvalId}/decide`,
      decision
    );
    return response.data;
  }

  /**
   * Busca estatísticas de transferências do usuário logado
   * Inclui: total enviado, recebido, aprovações pendentes, aprovadas, rejeitadas e expiradas
   * @returns Estatísticas de transferências
   */
  async getStatistics(): Promise<TransferStatistics> {
    const response = await api.get<TransferStatistics>("/api/v1/transfers/statistics");
    return response.data;
  }

  /**
   * Helper: Formata o texto do motivo da transferência
   * @param reason Motivo da transferência
   * @returns Texto formatado em português
   */
  formatReason(reason: string): string {
    const reasonMap: Record<string, string> = {
      reassignment: "Reatribuição",
      workload_balance: "Balanceamento de Carga",
      expertise: "Especialização",
      vacation: "Férias",
      other: "Outro",
    };
    return reasonMap[reason] || reason;
  }

  /**
   * Helper: Formata o status da transferência
   * @param status Status da transferência
   * @returns Texto formatado em português
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      completed: "Concluída",
      pending_approval: "Aguardando Aprovação",
      rejected: "Rejeitada",
    };
    return statusMap[status] || status;
  }

  /**
   * Helper: Formata o status da aprovação
   * @param status Status da aprovação
   * @returns Texto formatado em português
   */
  formatApprovalStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Pendente",
      approved: "Aprovada",
      rejected: "Rejeitada",
      expired: "Expirada",
    };
    return statusMap[status] || status;
  }

  /**
   * Helper: Retorna a cor do badge baseado no status
   * @param status Status da transferência
   * @returns Classe Tailwind para cor do badge
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  }

  /**
   * Helper: Retorna a cor do badge baseado no status da aprovação
   * @param status Status da aprovação
   * @returns Classe Tailwind para cor do badge
   */
  getApprovalStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  }
}

export default new TransferService();
