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
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      {/* Input de busca */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectCard(result.id)}
                  className="w-full px-4 py-3 hover:bg-slate-700 transition-colors text-left flex items-start gap-3 border-b border-slate-700/50 last:border-0"
                >
                  <FileText size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium truncate">{result.title}</h4>
                      {result.is_won && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                          Ganho
                        </span>
                      )}
                      {result.is_lost && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                          Perdido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
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
            <div className="py-8 text-center text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum card encontrado</p>
              <p className="text-xs mt-1">Tente outro termo de busca</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
