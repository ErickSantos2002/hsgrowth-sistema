import { Zap, Mail } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import { Card } from "../../types";

interface AutomacoesSectionProps {
  card: Card;
  onUpdate: (updates: Partial<Card>) => Promise<void>;
}

export default function AutomacoesSection({ card, onUpdate }: AutomacoesSectionProps) {
  const handleToggleAutomacao01 = async () => {
    await onUpdate({ automacao01: !card.automacao01 });
  };

  const activeCount = card.automacao01 ? 1 : 0;

  return (
    <ExpandableSection
      title="Automações"
      defaultExpanded={false}
      icon={<Zap size={18} />}
      badge={activeCount > 0 ? activeCount : undefined}
    >
      <div className="space-y-3">
        {/* Automação 01 — Nutrição por E-mail */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              card.automacao01
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-slate-500"
            }`}>
              <Mail size={15} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Nutrição por E-mail
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {card.automacao01
                  ? "Enviando e-mails diários para o cliente"
                  : "Envio de e-mails automáticos inativo"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAutomacao01}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              card.automacao01 ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
            }`}
            title={card.automacao01 ? "Desativar nutrição por e-mail" : "Ativar nutrição por e-mail"}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                card.automacao01 ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </ExpandableSection>
  );
}
