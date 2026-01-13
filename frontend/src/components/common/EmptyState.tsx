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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Ícone */}
      <div className="mb-6 p-6 bg-gray-800/30 rounded-full">
        <Icon size={64} className="text-gray-600" />
      </div>

      {/* Título */}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>

      {/* Descrição */}
      <p className="text-gray-400 text-center max-w-md mb-8">{description}</p>

      {/* Botão de ação (opcional) */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
