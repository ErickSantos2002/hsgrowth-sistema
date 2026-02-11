import { useState, useMemo } from "react";

/**
 * Configuração de filtros disponíveis
 */
interface FilterConfig<T> {
  // Função para filtrar por termo de busca
  search?: (item: T, term: string) => boolean;

  // Função para filtrar por status
  status?: (item: T, status: string) => boolean;

  // Função para filtrar por categoria
  category?: (item: T, category: string) => boolean;

  // Filtros customizados adicionais
  [key: string]: ((item: T, value: any) => boolean) | undefined;
}

/**
 * Hook reutilizável para filtrar listas
 * Suporta busca por texto, status, categoria e filtros customizados
 *
 * @param items - Array de items para filtrar
 * @param config - Configuração de funções de filtro
 * @returns Objeto com items filtrados e funções de controle
 */
export function useFilter<T>(
  items: T[],
  config: FilterConfig<T> = {}
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({});

  /**
   * Aplica todos os filtros configurados
   */
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de busca
      if (searchTerm && config.search) {
        if (!config.search(item, searchTerm)) {
          return false;
        }
      }

      // Filtro de status
      if (statusFilter !== "all" && config.status) {
        if (!config.status(item, statusFilter)) {
          return false;
        }
      }

      // Filtro de categoria
      if (categoryFilter !== "all" && config.category) {
        if (!config.category(item, categoryFilter)) {
          return false;
        }
      }

      // Filtros customizados
      for (const [key, value] of Object.entries(customFilters)) {
        if (value !== undefined && value !== "all" && config[key]) {
          const filterFn = config[key];
          if (filterFn && !filterFn(item, value)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, categoryFilter, customFilters, config]);

  /**
   * Define um filtro customizado
   */
  const setCustomFilter = (key: string, value: any) => {
    setCustomFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Remove um filtro customizado
   */
  const removeCustomFilter = (key: string) => {
    setCustomFilters((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  /**
   * Limpa todos os filtros
   */
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCustomFilters({});
  };

  /**
   * Verifica se algum filtro está ativo
   */
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== "" ||
      statusFilter !== "all" ||
      categoryFilter !== "all" ||
      Object.keys(customFilters).length > 0
    );
  }, [searchTerm, statusFilter, categoryFilter, customFilters]);

  return {
    // Items filtrados
    filteredItems,

    // Estado dos filtros
    searchTerm,
    statusFilter,
    categoryFilter,
    customFilters,

    // Setters
    setSearchTerm,
    setStatusFilter,
    setCategoryFilter,
    setCustomFilter,
    removeCustomFilter,

    // Utilitários
    clearAllFilters,
    hasActiveFilters,

    // Contadores
    totalItems: items.length,
    filteredCount: filteredItems.length,
  };
}

/**
 * Funções helper comuns para filtros
 */
export const filterHelpers = {
  /**
   * Filtro de busca case-insensitive em múltiplos campos de texto
   */
  searchInFields: <T>(fields: (keyof T)[]) => (item: T, term: string): boolean => {
    const lowerTerm = term.toLowerCase();
    return fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(lowerTerm);
      }
      return false;
    });
  },

  /**
   * Filtro de status simples por campo booleano
   */
  booleanStatus: <T>(field: keyof T) => (item: T, status: string): boolean => {
    if (status === "active") return !!item[field];
    if (status === "inactive") return !item[field];
    return true;
  },

  /**
   * Filtro por igualdade de campo
   */
  equalTo: <T>(field: keyof T) => (item: T, value: any): boolean => {
    return item[field] === value;
  },

  /**
   * Filtro por campo contém valor (arrays)
   */
  contains: <T>(field: keyof T) => (item: T, value: any): boolean => {
    const fieldValue = item[field];
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(value);
    }
    return false;
  },
};
