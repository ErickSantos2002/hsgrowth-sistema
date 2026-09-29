import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, FileText, Wrench, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchService, { GlobalSearchResponse } from "../services/searchService";
import { showError } from "../utils/toast";

const VAZIO: GlobalSearchResponse = { vendas: [], servico: [] };

/**
 * Busca Global (Ctrl+K)
 * Busca cards de Vendas e de Serviço/Cobrança por título, cliente, CNPJ/CPF, contato
 * e — no Serviço — nº de série / nº do módulo dos aparelhos.
 * Os resultados de Serviço só aparecem para quem acessa o módulo.
 */
const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResponse>(VAZIO);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce da busca
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(VAZIO);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setResults(await searchService.global(query.trim(), 8));
      } catch (error) {
        console.error("Erro na busca global:", error);
        showError("Erro ao realizar a busca. Tente novamente.");
        setResults(VAZIO);
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

  const go = (path: string) => {
    navigate(path);
    setQuery("");
    setResults(VAZIO);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults(VAZIO);
    inputRef.current?.focus();
  };

  const formatValue = (value: number | null) => {
    if (!value) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const total = results.vendas.length + results.servico.length;

  const StatusBadge: React.FC<{ won: boolean; lost: boolean }> = ({ won, lost }) => (
    <>
      {won && (
        <span className="rounded border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Ganho</span>
      )}
      {lost && (
        <span className="rounded border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs text-red-400">Perdido</span>
      )}
    </>
  );

  // Etiqueta "por onde bateu" — ajuda quando o termo não está no título (CNPJ, série...)
  const Match: React.FC<{ on: string | null }> = ({ on }) =>
    on && on !== "Título" ? (
      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-400">{on}</span>
    ) : null;

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>
  );

  const rowCls =
    "flex w-full items-start gap-3 border-b border-gray-200/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-200 dark:border-slate-700/50 dark:hover:bg-slate-700";

  return (
    <div ref={searchRef} className="relative max-w-2xl flex-1">
      {/* Input de busca */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar por título, cliente, CNPJ ou nº de série... (Ctrl+K)"
          className="w-full rounded-lg border border-gray-200 bg-gray-100/50 py-2.5 pl-10 pr-10 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full z-50 mt-2 max-h-[28rem] w-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-100 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400 dark:text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Buscando...</span>
            </div>
          ) : total > 0 ? (
            <div className="py-1">
              {results.vendas.length > 0 && (
                <>
                  <SectionTitle>Vendas ({results.vendas.length})</SectionTitle>
                  {results.vendas.map((r) => (
                    <button key={`v-${r.id}`} onClick={() => go(`/cards/${r.id}`)} className={rowCls}>
                      <FileText size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="truncate font-medium text-slate-900 dark:text-white">{r.title}</h4>
                          <StatusBadge won={r.is_won} lost={r.is_lost} />
                          <Match on={r.matched_on} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 dark:text-slate-400">
                          {r.list_name && <span>{r.list_name}</span>}
                          {r.client_name && <span>• {r.client_name}</span>}
                          {r.assigned_to_name && <span>• {r.assigned_to_name}</span>}
                          {r.value ? <span className="text-emerald-400">• {formatValue(r.value)}</span> : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {results.servico.length > 0 && (
                <>
                  <SectionTitle>Serviço ({results.servico.length})</SectionTitle>
                  {results.servico.map((r) => (
                    <button key={`s-${r.id}`} onClick={() => go(`/servicos/${r.board_id}/cards/${r.id}`)} className={rowCls}>
                      <Wrench size={18} className="mt-0.5 flex-shrink-0 text-violet-400" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="truncate font-medium text-slate-900 dark:text-white">{r.title}</h4>
                          <StatusBadge won={r.is_won} lost={r.is_lost} />
                          <Match on={r.matched_on} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 dark:text-slate-400">
                          {(r.board_name || r.list_name) && (
                            <span>{[r.board_name, r.list_name].filter(Boolean).join(" / ")}</span>
                          )}
                          {r.client_name && <span>• {r.client_name}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 dark:text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum card encontrado</p>
              <p className="mt-1 text-xs">Tente título, cliente, CNPJ ou nº de série</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
