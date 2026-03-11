import { Sparkles, X, Trash2, CreditCard, LayoutDashboard, Users, Globe } from "lucide-react";
import { AgentPageContext } from "../../types";

interface AgentHeaderProps {
  onClose: () => void;
  onClearHistory: () => void;
  hasMessages: boolean;
  pageContext: AgentPageContext;
}

/** Configuração visual de cada contexto de página */
const CONTEXT_CONFIG: Record<AgentPageContext, { label: string; Icon: React.ElementType }> = {
  card_detail: { label: "Card atual", Icon: CreditCard },
  board:       { label: "Board atual", Icon: LayoutDashboard },
  clients:     { label: "Clientes",    Icon: Users },
  general:     { label: "Geral",       Icon: Globe },
};

/**
 * Barra superior do widget Agent Growth.
 * Exibe o contexto ativo para que o usuário saiba como o agente está interpretando a página.
 */
export default function AgentHeader({
  onClose,
  onClearHistory,
  hasMessages,
  pageContext,
}: AgentHeaderProps) {
  const ctx = CONTEXT_CONFIG[pageContext];
  const CtxIcon = ctx.Icon;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-2xl">
      {/* Identidade do agente */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <Sparkles size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">
            Agent Growth
          </h3>
          {/* Badge de contexto ativo — mostra ao usuário de onde o agente está lendo */}
          <div className="flex items-center gap-1 mt-0.5">
            <CtxIcon size={10} className="text-blue-200" />
            <p className="text-[10px] text-blue-100">{ctx.label}</p>
          </div>
        </div>
      </div>

      {/* Ações do cabeçalho */}
      <div className="flex items-center gap-1">
        {/* Botão de limpar histórico — só aparece se há mensagens */}
        {hasMessages && (
          <button
            onClick={onClearHistory}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            title="Limpar conversa"
          >
            <Trash2 size={15} />
          </button>
        )}

        {/* Botão de fechar o widget */}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          title="Fechar"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
