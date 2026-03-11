import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAgentContext } from "../../hooks/useAgentContext";
import AgentChatWindow from "./AgentChatWindow";

/**
 * Widget flutuante do Agent Growth.
 * Fixado no canto inferior direito da tela, disponível em todas as páginas autenticadas.
 * Ao clicar, abre a janela de chat contextualizada com base na página atual.
 *
 * Não deve ser renderizado para usuários com role 'viewer' — controle feito no MainLayout.
 */
export default function AgentGrowthWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { pageContext, cardId, boardId, initialOptions } = useAgentContext();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Janela de chat — exibida acima do botão quando aberta */}
      {isOpen && (
        <AgentChatWindow
          onClose={() => setIsOpen(false)}
          pageContext={pageContext}
          cardId={cardId}
          boardId={boardId}
          initialOptions={initialOptions}
        />
      )}

      {/* Botão circular para abrir/fechar o widget */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex h-14 w-14 items-center justify-center rounded-full shadow-lg
          transition-all duration-200 active:scale-95
          ${
            isOpen
              ? "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700"
              : "bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-blue-500/30"
          }
        `}
        title={isOpen ? "Fechar Agent Growth" : "Abrir Agent Growth"}
        aria-label={isOpen ? "Fechar Agent Growth" : "Abrir Agent Growth"}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <Sparkles size={22} className="text-white" />
        )}
      </button>
    </div>
  );
}
