import { Check } from "lucide-react";
import { AgentActionId, AgentOption } from "../../types";

interface AgentOptionChipsProps {
  options: AgentOption[];
  onSelect: (option: AgentOption) => void;
  isLoading: boolean;
  usedActionIds: Set<AgentActionId>;
}

/**
 * Grade de chips com todas as ações disponíveis no contexto atual.
 * Três estados visuais por chip:
 *   - Ativo:    azul, clicável
 *   - Em uso:   cinza claro, cursor desabilitado (aguardando resposta)
 *   - Concluído: cinza com ✓, não clicável (já foi usado nesta sessão)
 *
 * A lista completa fica sempre visível para o usuário saber o que pode explorar.
 */
export default function AgentOptionChips({
  options,
  onSelect,
  isLoading,
  usedActionIds,
}: AgentOptionChipsProps) {
  if (options.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-1">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
        O que você quer fazer?
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isUsed = usedActionIds.has(option.action_id);
          // Chip está desabilitado se: já foi usado OU está carregando
          const isDisabled = isUsed || isLoading;

          return (
            <button
              key={option.action_id}
              onClick={() => !isDisabled && onSelect(option)}
              disabled={isDisabled}
              className={`
                flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all
                ${isUsed
                  // Concluído: cinza com checkmark — já foi usado nesta sessão
                  ? "cursor-default border-gray-200 bg-gray-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  : isLoading
                    // Em carregamento: chips ainda não usados ficam discretos
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-600"
                    // Ativo: azul clicável
                    : "cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 active:scale-95 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                }
              `}
            >
              {/* Ícone de check para chips já usados */}
              {isUsed && <Check size={10} className="flex-shrink-0" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
