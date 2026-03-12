import React from "react";
import { User } from "../../types";
import { Select } from "../common";
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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
      {/* Botões pill de período */}
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

      <div className="hidden h-6 w-px bg-gray-200 dark:bg-slate-700 sm:block" />

      {/* Select de tipo */}
      <Select
        value={filters.taskType}
        onChange={(e) => update("taskType", e.target.value)}
        fullWidth={false}
        className="py-2 text-sm"
      >
        <option value="">Todos os tipos</option>
        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </Select>

      {/* Select de prioridade */}
      <Select
        value={filters.priority}
        onChange={(e) => update("priority", e.target.value)}
        fullWidth={false}
        className="py-2 text-sm"
      >
        <option value="">Todas as prioridades</option>
        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </Select>

      {/* Select de responsável — visível apenas para admin/manager */}
      {isAdminOrManager && (
        <Select
          value={filters.assignedToId ?? ""}
          onChange={(e) => update("assignedToId", e.target.value ? Number(e.target.value) : null)}
          fullWidth={false}
          className="py-2 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.name || user.username}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
};

export default ActivityFilters;
