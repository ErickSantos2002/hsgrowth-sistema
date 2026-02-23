import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import cardService from "../services/cardService";

interface SearchResult {
  id: number;
  title: string;
  list_name: string | null;
  board_id: number | null;
  assigned_to_name: string | null;
  value: number | null;
  is_won: boolean;
  is_lost: boolean;
}

/**
 * Componente de Busca Global
 * Busca cards em todos os boards pelo título
 */
const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce da busca
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await cardService.globalSearch(query, 10);
        setResults(response);
      } catch (error) {
        console.error("Erro na busca global:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms de debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atalho de teclado Ctrl+K ou Cmd+K para focar na busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      // ESC para fechar
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectCard = (cardId: number) => {
    navigate(`/cards/${cardId}`);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const formatValue = (value: number | null) => {
    if (!value) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div ref={searchRef} className="relative max-w-2xl flex-1">
      {/* Input de busca */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar cards em todos os boards... (Ctrl+K)"
          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400 dark:text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectCard(result.id)}
                  className="flex w-full items-start gap-3 border-b border-gray-200/50 dark:border-slate-700/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  <FileText size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="truncate font-medium text-slate-900 dark:text-white">{result.title}</h4>
                      {result.is_won && (
                        <span className="rounded border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                          Ganho
                        </span>
                      )}
                      {result.is_lost && (
                        <span className="rounded border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          Perdido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-400">
                      {result.list_name && <span>{result.list_name}</span>}
                      {result.assigned_to_name && (
                        <>
                          <span>•</span>
                          <span>{result.assigned_to_name}</span>
                        </>
                      )}
                      {result.value && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">{formatValue(result.value)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 dark:text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum card encontrado</p>
              <p className="mt-1 text-xs">Tente outro termo de busca</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
