import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {/* Botões pill de período */}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
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

      <div className="hidden h-6 w-px bg-gray-200 dark:bg-slate-700 sm:block" />

      {/* Wrappers flex-col nos selects para ficarem w-full no mobile */}
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <div className="w-full sm:w-auto">
          <SelectMenu
            value={filters.taskType}
            options={typeOptions}
            onChange={(v) => update("taskType", v)}
          />
        </div>

        <div className="w-full sm:w-auto">
          <SelectMenu
            value={filters.priority}
            options={priorityOptions}
            onChange={(v) => update("priority", v)}
          />
        </div>

        {isAdminOrManager && (
          <div className="w-full sm:w-auto">
            <SelectMenu
              value={filters.assignedToId != null ? String(filters.assignedToId) : ""}
              options={userOptions}
              onChange={(v) => update("assignedToId", v ? Number(v) : null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFilters;
