import { useState, useMemo } from "react";

/**
 * Hook reutilizável para paginação de arrays
 * Elimina duplicação de lógica de paginação em múltiplas páginas
 *
 * @param items - Array de items para paginar
 * @param itemsPerPage - Número de items por página (padrão: 10)
 * @returns Objeto com items paginados e funções de controle
 */
export function usePagination<T>(
  items: T[],
  itemsPerPage: number = 10
) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calcula total de páginas
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  // Garante que a página atual está dentro dos limites
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Items da página atual
  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, safePage, itemsPerPage]);

  // Gera array de números de página para exibição
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safePage, totalPages]);

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const goToNextPage = () => {
    if (safePage < totalPages) {
      setCurrentPage(safePage + 1);
    }
  };

  const goToPrevPage = () => {
    if (safePage > 1) {
      setCurrentPage(safePage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Reset para primeira página quando items mudam significativamente
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [items.length]);

  return {
    // Items paginados
    paginatedItems,

    // Informações de página
    currentPage: safePage,
    totalPages,
    pageNumbers,

    // Flags de navegação
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,

    // Funções de navegação
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    setCurrentPage,

    // Informações de items
    totalItems: items.length,
    itemsPerPage,
    startIndex: (safePage - 1) * itemsPerPage,
    endIndex: Math.min(safePage * itemsPerPage, items.length),
  };
}
