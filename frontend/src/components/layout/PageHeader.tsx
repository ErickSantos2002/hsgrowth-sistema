import React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

/**
 * Componente reutilizável para cabeçalhos de página
 *
 * Padroniza a estrutura de headers em todas as páginas com:
 * - Título + ícone consistente
 * - Descrição opcional
 * - Área para actions/botões
 * - Layout responsivo
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
}) => {
  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <Icon size={32} className="text-slate-900 dark:text-white" />
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
