import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  itemLabel?: string; // Ex: "usuários", "produtos", "registros"
}

/**
 * Componente reutilizável de paginação UI com suporte a modo claro e escuro
 *
 * Funciona perfeitamente com o hook usePagination.
 * Basta passar as props retornadas pelo hook diretamente.
 *
 * Exemplo de uso:
 * ```tsx
 * const pagination = usePagination(items, 10);
 *
 * <Pagination
 *   {...pagination}
 *   itemLabel="usuários"
 * />
 * ```
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageNumbers,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  goToPage,
  goToNextPage,
  goToPrevPage,
  itemLabel = "registros",
}) => {
  // Não renderiza se tiver apenas 1 página
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-slate-700">
      {/* Mobile - Navegação simples */}
      <div className="flex w-full items-center justify-between gap-2 md:hidden">
        <button
          disabled={!hasPrevPage}
          onClick={goToPrevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          Anterior
        </button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Página {currentPage} de {totalPages}
        </span>
        <button
          disabled={!hasNextPage}
          onClick={goToNextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          Próxima
        </button>
      </div>

      {/* Desktop - Navegação completa */}
      <div className="hidden w-full items-center justify-between md:flex">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Mostrando {startIndex + 1} a {endIndex} de {totalItems} {itemLabel}
        </div>
        <div className="flex gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={goToPrevPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Anterior
          </button>

          {/* Números de página */}
          <div className="flex gap-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`min-w-10 rounded-lg px-3 py-1 text-sm transition-colors ${
                  pageNum === currentPage
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 bg-white text-slate-900 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            disabled={!hasNextPage}
            onClick={goToNextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};
