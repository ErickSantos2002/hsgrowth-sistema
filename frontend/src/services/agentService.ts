import api from "./api";
import {
  AgentChatRequest,
  AgentChatResponse,
  AgentRateLimitStatus,
} from "../types";

/**
 * Serviço do Agent Growth
 * Gerencia chamadas ao widget de chat com IA integrado ao CRM
 */
class AgentService {
  /**
   * Envia uma ação selecionada pelo usuário e retorna a resposta do agente.
   * Inclui verificação de rate limit — o backend retorna 429 se excedido.
   */
  async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    const response = await api.post<AgentChatResponse>(
      "/api/v1/ai/agent/chat",
      request
    );
    return response.data;
  }

  /**
   * Consulta o status do rate limit do usuário autenticado sem incrementar o contador.
   * Útil para exibir quantas chamadas restam antes de o usuário interagir.
   */
  async getRateLimitStatus(): Promise<AgentRateLimitStatus> {
    const response = await api.get<AgentRateLimitStatus>(
      "/api/v1/ai/agent/rate-limit-status"
    );
    return response.data;
  }
}

export default new AgentService();
