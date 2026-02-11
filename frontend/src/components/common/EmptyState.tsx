import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Componente genérico para estado vazio
 * Exibido quando não há dados para mostrar
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      {/* Ícone */}
      <div className="mb-6 rounded-full bg-gray-800/30 p-6">
        <Icon size={64} className="text-gray-600" />
      </div>

      {/* Título */}
      <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>

      {/* Descrição */}
      <p className="mb-8 max-w-md text-center text-gray-400">{description}</p>

      {/* Botão de ação (opcional) */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-white shadow-lg transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
