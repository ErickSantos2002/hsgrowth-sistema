import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import type { BoardParceria } from "../../constants/parcerias";

interface Props {
  board: BoardParceria;
  busca: string;
  onBusca: (texto: string) => void;
  placeholderBusca: string;
  /** Botões e filtros do lado direito. */
  children?: React.ReactNode;
}

/** Cabeçalho do kanban, igual ao dos boards de Serviço: voltar, ícone, nome e ações. */
export default function CabecalhoBoard({ board, busca, onBusca, placeholderBusca, children }: Props) {
  const navigate = useNavigate();
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const Icone = board.icone;

  return (
    <div className="relative z-20 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50 lg:z-50">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <button
            onClick={() => navigate("/parcerias")}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
            title="Voltar para Boards de Parcerias"
          >
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: `${board.cor}20` }}>
              <Icone size={24} style={{ color: board.cor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{board.nome}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{board.descricao}</p>
            </div>
          </div>
        </div>

        <div className="mt-1 flex w-full items-center justify-end gap-2 sm:mt-0 sm:w-auto sm:gap-3">
          {mostrarBusca ? (
            <div className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800/50 sm:w-auto">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => onBusca(e.target.value)}
                placeholder={placeholderBusca}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-white sm:w-64"
                onBlur={() => { if (!busca) setMostrarBusca(false); }}
              />
              {busca && (
                <button
                  onClick={() => { onBusca(""); setMostrarBusca(false); }}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setMostrarBusca(true)}
              className={`rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${busca ? "bg-violet-500/20" : ""}`}
              title="Buscar cards"
            >
              <Search size={20} className={busca ? "text-violet-400" : "text-slate-500 dark:text-slate-400"} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Botão roxo em degradê do cabeçalho (o "Nova Lista" dos boards de Serviço). */
export function BotaoNovo({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 text-white shadow-lg transition-all hover:from-violet-600 hover:to-purple-600"
    >
      <Plus size={20} />
      <span className="hidden sm:inline">{rotulo}</span>
    </button>
  );
}
