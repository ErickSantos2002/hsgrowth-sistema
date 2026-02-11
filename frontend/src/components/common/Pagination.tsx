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
 * Componente reutilizável de paginação UI
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
 *
 * Features:
 * - Versão mobile (navegação simples)
 * - Versão desktop (números de página)
 * - Contador de registros
 * - Botões desabilitados quando necessário
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
    <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-6">
      {/* Mobile - Navegação simples */}
      <div className="flex w-full items-center justify-between gap-2 md:hidden">
        <button
          disabled={!hasPrevPage}
          onClick={goToPrevPage}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-slate-400">
          Página {currentPage} de {totalPages}
        </span>
        <button
          disabled={!hasNextPage}
          onClick={goToNextPage}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>

      {/* Desktop - Navegação completa */}
      <div className="hidden w-full items-center justify-between md:flex">
        <div className="text-sm text-slate-400">
          Mostrando {startIndex + 1} a {endIndex} de {totalItems} {itemLabel}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={goToPrevPage}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          {/* Números de página */}
          <div className="flex gap-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`min-w-10 rounded-lg px-3 py-2 text-sm transition-colors ${
                  pageNum === currentPage
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            disabled={!hasNextPage}
            onClick={goToNextPage}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};
