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
    <div className="mt-6 border-t border-slate-700 px-6 pb-4 pt-4">
      {/* Desktop - Navegação completa */}
      <div className="hidden items-center justify-between text-sm text-slate-400 md:flex">
        <div>
          Mostrando {startIndex + 1} a {endIndex} de {totalItems} {itemLabel}
        </div>
        <div className="flex gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={goToPrevPage}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Mobile - Navegação simples */}
      <div className="mt-3 flex flex-col items-center text-sm text-slate-400 md:hidden">
        <div className="mb-2">
          Mostrando {startIndex + 1} a {endIndex} de {totalItems} {itemLabel}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={goToPrevPage}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Página anterior"
          >
            {"<"}
          </button>
          <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white">
            {currentPage}
          </span>
          <button
            disabled={!hasNextPage}
            onClick={goToNextPage}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Próxima página"
          >
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
};
