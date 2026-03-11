import { useRef, useEffect } from "react";
import { AgentMessage } from "../../types";
import AgentMessageBubble from "./AgentMessageBubble";
import AgentLoadingIndicator from "./AgentLoadingIndicator";

interface AgentMessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
}

/**
 * Lista de mensagens do Agent Growth com auto-scroll para a última mensagem.
 * Exibe o indicador de carregamento animado enquanto o agente processa.
 */
export default function AgentMessageList({
  messages,
  isLoading,
}: AgentMessageListProps) {
  // Referência para o elemento sentinela no final da lista
  const bottomRef = useRef<HTMLDivElement>(null);

  // Rola automaticamente para a última mensagem sempre que o conteúdo mudar
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {messages.map((msg) => (
        <AgentMessageBubble key={msg.id} message={msg} />
      ))}

      {/* Indicador de digitação exibido enquanto aguarda resposta da IA */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
            <AgentLoadingIndicator />
          </div>
        </div>
      )}

      {/* Elemento sentinela para o auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
