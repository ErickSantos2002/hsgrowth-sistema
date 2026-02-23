/**
 * Constantes de cores centralizadas para uso programático
 *
 * Use estas constantes para:
 * - Gráficos e visualizações (Chart.js, Recharts, etc.)
 * - Inline styles quando necessário
 * - Manipulação programática de cores
 *
 * Para classes CSS, prefira usar as classes Tailwind definidas em tailwind.config.js
 */

// Cores HEX para uso programático (gráficos, inline styles)
export const COLORS = {
  primary: '#10b981',

  surface: {
    base: '#0f172a',
    elevated: '#1e293b',
    hover: '#334155',
  },

  content: {
    primary: '#ffffff',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    disabled: '#64748b',
  },

  border: {
    default: '#334155',
    light: '#475569',
    focus: '#10b981',
  },

  status: {
    success: '#34d399',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',
  },

  board: {
    blue: '#3B82F6',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    gray: '#6B7280',
  },
} as const;

// Tipos para autocomplete e type safety
export type ColorKey = keyof typeof COLORS.board;
export type StatusKey = keyof typeof COLORS.status;

/**
 * Helper para obter cor de board por nome
 */
export const getBoardColor = (color: string): string => {
  const colorKey = color.toLowerCase() as ColorKey;
  return COLORS.board[colorKey] || color;
};

/**
 * Helper para obter cor de status por tipo
 */
export const getStatusColor = (status: StatusKey): string => {
  return COLORS.status[status];
};

/**
 * Retorna um conjunto de cores adaptado ao tema atual.
 * Use em componentes que precisam de cores programáticas (Recharts, React Flow, etc.)
 * porque esses componentes não suportam classes Tailwind com prefixo dark:.
 *
 * @param darkMode - true para tema escuro, false para tema claro
 */
export const getChartColors = (darkMode: boolean) => ({
  surface: darkMode
    ? { base: '#0f172a', elevated: '#1e293b', hover: '#334155' }
    : { base: '#f9fafb', elevated: '#ffffff', hover: '#f3f4f6' },

  content: darkMode
    ? { primary: '#ffffff', secondary: '#cbd5e1', tertiary: '#94a3b8', disabled: '#64748b' }
    : { primary: '#0f172a', secondary: '#475569', tertiary: '#64748b', disabled: '#9ca3af' },

  border: darkMode
    ? { default: '#334155', light: '#475569', focus: '#10b981' }
    : { default: '#e5e7eb', light: '#d1d5db', focus: '#10b981' },
});
