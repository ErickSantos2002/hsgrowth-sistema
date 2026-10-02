import React from "react";
import { Check } from "lucide-react";

interface CardCheckButtonProps {
  checked: boolean;
  onToggle: () => void;
}

/**
 * Bolinha "concluído" pessoal (estilo Trello), à esquerda do título do card.
 * Marcada: verde, sempre visível. Vazia: no desktop só aparece ao passar o mouse
 * no card (o card precisa da classe `group`); no celular fica sempre visível.
 */
const CardCheckButton: React.FC<CardCheckButtonProps> = ({ checked, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    onAuxClick={(e) => e.stopPropagation()}
    title={checked ? "Concluído por você — clique para desmarcar" : "Marcar como concluído (só para você)"}
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

export default CardCheckButton;
