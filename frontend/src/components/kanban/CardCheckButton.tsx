import React from "react";
import { Check } from "lucide-react";

interface CardCheckButtonProps {
  checked: boolean;
  onToggle: () => void;
  /** "card" (padrão): no card do board. "detail": maior e sempre visível, no topo da tela do card. */
  variant?: "card" | "detail";
}

/**
 * Bolinha "concluído" pessoal (estilo Trello).
 * No card do board: marcada fica verde e sempre visível; vazia, no desktop só aparece
 * ao passar o mouse no card (o card precisa da classe `group`); no celular fica sempre visível.
 * No detalhe do card: sempre visível.
 */
const CardCheckButton: React.FC<CardCheckButtonProps> = ({ checked, onToggle, variant = "card" }) => {
  const title = checked ? "Concluído por você — clique para desmarcar" : "Marcar como concluído (só para você)";

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={title}
        aria-label={checked ? "Desmarcar concluído" : "Marcar como concluído"}
        aria-pressed={checked}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          checked
            ? "border-green-500 bg-green-500 text-white hover:bg-green-600"
            : "border-slate-400 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-500"
        }`}
      >
        <Check size={18} strokeWidth={3} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onAuxClick={(e) => e.stopPropagation()}
      title={title}
      aria-label={checked ? "Desmarcar concluído" : "Marcar como concluído"}
      aria-pressed={checked}
      className={`mt-0.5 flex h-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border transition-all ${
        checked
          ? "mr-1.5 w-4 border-green-500 bg-green-500 text-white"
          : "mr-1.5 w-4 border-slate-400 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-500 sm:mr-0 sm:w-0 sm:border-0 sm:group-hover:mr-1.5 sm:group-hover:w-4 sm:group-hover:border"
      }`}
    >
      <Check size={11} strokeWidth={3} />
    </button>
  );
};

export default CardCheckButton;
