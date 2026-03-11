import { useState, useCallback } from "react";
import { AgentMessage, AgentActionId, AgentOption, AgentPageContext } from "../../types";
import agentService from "../../services/agentService";
import AgentHeader from "./AgentHeader";
import AgentMessageList from "./AgentMessageList";
import AgentOptionChips from "./AgentOptionChips";

interface AgentChatWindowProps {
  onClose: () => void;
  pageContext: AgentPageContext;
  cardId?: number;
  boardId?: number;
  /** Lista completa de chips para o contexto + role atual. Fixa durante a sessão. */
  initialOptions: AgentOption[];
}

/**
 * Janela principal do chat do Agent Growth.
 *
 * Mudança de paradigma em relação à versão anterior:
 * - A lista de chips é FIXA (definida pelo contexto + role ao abrir o widget)
 * - Chips já clicados ficam visíveis mas desabilitados com ✓ (rastreados em usedActionIds)
 * - Não há mais troca de chips pós-resposta — o usuário vê sempre o menu completo do contexto
 * - O histórico reseta ao limpar ou fechar o widget
 */
export default function AgentChatWindow({
  onClose,
  pageContext,
  cardId,
  boardId,
  initialOptions,
}: AgentChatWindowProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Rastreia quais chips já foram usados nesta sessão
  const [usedActionIds, setUsedActionIds] = useState<Set<AgentActionId>>(new Set());

  /**
   * Limpa o histórico e restaura todos os chips como disponíveis.
   */
  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setUsedActionIds(new Set());
  }, []);

  /**
   * Processa o clique em um chip:
   * 1. Marca o chip como usado imediatamente (feedback visual instantâneo)
   * 2. Adiciona mensagem do usuário
   * 3. Chama a API e adiciona resposta do agente
   */
  const handleOptionSelect = useCallback(
    async (option: AgentOption) => {
      if (isLoading) return;

      // Marca o chip como usado antes da chamada (feedback imediato)
      setUsedActionIds((prev) => new Set([...prev, option.action_id]));

      const userMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: option.label,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await agentService.chat({
          action_id: option.action_id,
          card_id: cardId,
          page_context: pageContext,
          extra_params: boardId ? { board_id: boardId } : undefined,
        });

        const agentMessage: AgentMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: response.message,
          timestamp: new Date(),
          is_copyable: true,
        };

        setMessages((prev) => [...prev, agentMessage]);
      } catch (err: any) {
        // Se deu erro, remove o chip da lista de usados para o usuário poder tentar de novo
        setUsedActionIds((prev) => {
          const next = new Set(prev);
          next.delete(option.action_id);
          return next;
        });

        const errorContent =
          err?.response?.status === 429
            ? "Você atingiu o limite de chamadas. Aguarde um momento antes de tentar novamente."
            : "Ocorreu um erro ao processar sua solicitação. Tente novamente.";

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "agent",
            content: errorContent,
            timestamp: new Date(),
            is_copyable: false,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, cardId, boardId, pageContext]
  );

  // Verifica se todos os chips já foram usados nesta sessão
  const allUsed = initialOptions.length > 0 &&
    initialOptions.every((opt) => usedActionIds.has(opt.action_id));

  return (
    <div className="flex flex-col w-[380px] h-[520px] rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <AgentHeader
        onClose={onClose}
        onClearHistory={handleClearHistory}
        hasMessages={messages.length > 0}
        pageContext={pageContext}
      />

      {/* Área de mensagens */}
      {messages.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Como posso te ajudar?
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Selecione uma das opções abaixo para começar.
          </p>
        </div>
      ) : (
        <AgentMessageList messages={messages} isLoading={isLoading} />
      )}

      {/* Se explorou tudo, sugere limpar para recomeçar */}
      {allUsed && !isLoading ? (
        <div className="px-3 pb-3 pt-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            Você explorou todas as opções disponíveis aqui.
          </p>
          <button
            onClick={handleClearHistory}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar conversa e recomeçar
          </button>
        </div>
      ) : (
        <AgentOptionChips
          options={initialOptions}
          onSelect={handleOptionSelect}
          isLoading={isLoading}
          usedActionIds={usedActionIds}
        />
      )}
    </div>
  );
}
