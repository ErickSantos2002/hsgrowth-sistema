import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
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
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden bg-slate-800/30 backdrop-blur-sm">
      {/* Header da seção - clicável para expandir/recolher */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Ícone de expand/collapse */}
          {isExpanded ? (
            <ChevronDown size={18} className="text-slate-400" />
          ) : (
            <ChevronRight size={18} className="text-slate-400" />
          )}

          {/* Ícone opcional da seção */}
          {icon && <span className="text-slate-400">{icon}</span>}

          {/* Título da seção */}
          <span className="font-semibold text-white">{title}</span>

          {/* Badge opcional (ex: contagem) */}
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium border border-blue-500/30">
              {badge}
            </span>
          )}
        </div>
      </button>

      {/* Conteúdo da seção - visível apenas quando expandido */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;
