import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { User } from "../../types";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../../constants/cardTaskConfig";

export interface ActivityFilterState {
  period: "today" | "overdue" | "tomorrow" | "week" | "all";
  taskType: string;
  priority: string;
  assignedToId: number | null;
}

export const DEFAULT_FILTERS: ActivityFilterState = {
  period: "today",
  taskType: "",
  priority: "",
  assignedToId: null,
};

interface ActivityFiltersProps {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
  users: User[];
  isAdminOrManager: boolean;
}

// ─── SelectMenu inline (mesmo padrão de KanbanBoard/Persons) ─────────────────

interface SelectOption {
  value: string;
  label: string;
}

const SelectMenu: React.FC<{
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={menuRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? "Selecione"}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                opt.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Barra de filtros da página de atividades.
 * Stateless — todo o estado fica no Activities.tsx.
 */
const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  filters,
  onChange,
  users,
  isAdminOrManager,
}) => {
  const [showPanel, setShowPanel] = useState(false);

  const update = (field: keyof ActivityFilterState, value: ActivityFilterState[typeof field]) => {
    onChange({ ...filters, [field]: value });
  };

  const periodOptions: { value: ActivityFilterState["period"]; label: string }[] = [
    { value: "overdue", label: "Atrasadas" },
    { value: "today", label: "Hoje" },
    { value: "tomorrow", label: "Amanhã" },
    { value: "week", label: "Esta semana" },
    { value: "all", label: "Todas" },
  ];

  const typeOptions: SelectOption[] = [
    { value: "", label: "Todos os tipos" },
    ...Object.entries(TYPE_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  const priorityOptions: SelectOption[] = [
    { value: "", label: "Todas as prioridades" },
    ...Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  const userOptions: SelectOption[] = [
    { value: "", label: "Todos os responsáveis" },
    ...users.map((u) => ({
      value: String(u.id),
      label: u.full_name || u.name,
    })),
  ];

  const hasActiveFilters = !!(filters.taskType || filters.priority || filters.assignedToId);

  return (
    <div>
      {/* Linha principal: pills de período + botão Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => update("period", option.value)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${
                filters.period === option.value
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "border-gray-200 bg-transparent text-slate-600 hover:border-emerald-400/50 hover:bg-emerald-500/10 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-500/40"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowPanel((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
            showPanel || hasActiveFilters
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-gray-300 bg-white text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Filter size={15} />
          Filtros
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-600">
              {[filters.taskType, filters.priority, filters.assignedToId].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Painel colapsável */}
      {showPanel && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[170px] flex-1">
              <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</label>
              <SelectMenu
                value={filters.taskType}
                options={typeOptions}
                onChange={(v) => update("taskType", v)}
              />
            </div>

            <div className="min-w-[170px] flex-1">
              <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Prioridade</label>
              <SelectMenu
                value={filters.priority}
                options={priorityOptions}
                onChange={(v) => update("priority", v)}
              />
            </div>

            {isAdminOrManager && (
              <div className="min-w-[170px] flex-1">
                <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Responsável</label>
                <SelectMenu
                  value={filters.assignedToId != null ? String(filters.assignedToId) : ""}
                  options={userOptions}
                  onChange={(v) => update("assignedToId", v ? Number(v) : null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFilters;
