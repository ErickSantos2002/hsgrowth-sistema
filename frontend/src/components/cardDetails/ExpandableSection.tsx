import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  headerClassName?: string;
}

/**
 * Seção expansível/recolhível (Expand/Collapse) - Tema escuro
 * Usado na coluna esquerda para organizar informações
 */
const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  icon,
  badge,
  headerClassName,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 backdrop-blur-sm">
      {/* Header da seção - clicável para expandir/recolher */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-700/30 ${headerClassName || ""}`}
      >
        <div className="flex items-center gap-2">
          {/* Ícone de expand/collapse */}
          {isExpanded ? (
            <ChevronDown size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-400" />
          )}

          {/* Ícone opcional da seção */}
          {icon && <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{icon}</span>}

          {/* Título da seção */}
          <span className="font-semibold text-slate-900 dark:text-white">{title}</span>

          {/* Badge opcional (ex: contagem) */}
          {badge !== undefined && (
            <span className="ml-2 rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
              {badge}
            </span>
          )}
        </div>
      </button>

      {/* Conteúdo da seção - visível apenas quando expandido */}
      {isExpanded && (
        <div className="border-t border-gray-200/50 dark:border-slate-700/50 bg-gray-50/30 dark:bg-slate-900/30 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;
