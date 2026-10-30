import React, { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Etapa } from "../../services/parceriasService";
import { corDaEtapa } from "../../constants/parcerias";

interface Props<T> {
  etapas: Etapa[];
  itens: T[];
  idDe: (item: T) => number;
  etapaDe: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onAbrir: (item: T) => void;
  /** Ausente = só leitura (Financeiro). */
  onMover?: (item: T, destino: string) => void;
  /** "Adicionar card" no rodapé da primeira coluna, como nos boards de Serviço. */
  onAdicionar?: () => void;
  /** Resumo no pé de cada coluna (ex.: valor total). */
  rodapeColuna?: (itens: T[]) => React.ReactNode;
}

/** Badge pequeno dos cards (mesmo do kanban de Serviço). */
export function CardBadge({ cls, label, icon }: { cls: string; label: string; icon?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

export default function KanbanParcerias<T>({
  etapas, itens, idDe, etapaDe, renderCard, onAbrir, onMover, onAdicionar, rodapeColuna,
}: Props<T>) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  // Arrastar o fundo do quadro rola para os lados (como nos boards de Serviço).
  const quadroRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ inicioX: 0, scroll: 0 });
  const [rolando, setRolando] = useState(false);

  const soltar = (destino: string) => {
    const item = itens.find((i) => idDe(i) === arrastando);
    setArrastando(null);
    setSobre(null);
    if (item && onMover && etapaDe(item) !== destino) onMover(item, destino);
  };

  return (
    <div
      ref={quadroRef}
      onMouseDown={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.closest("[data-card-parceria]") || alvo.closest("button, input, select, textarea")) return;
        setRolando(true);
        panRef.current = { inicioX: e.pageX, scroll: quadroRef.current?.scrollLeft || 0 };
      }}
      onMouseMove={(e) => {
        if (!rolando || !quadroRef.current) return;
        quadroRef.current.scrollLeft = panRef.current.scroll - (e.pageX - panRef.current.inicioX);
      }}
      onMouseUp={() => setRolando(false)}
      onMouseLeave={() => setRolando(false)}
      className={`scrollbar-hidden flex-1 overflow-x-auto overflow-y-hidden p-6 pb-20 ${rolando ? "cursor-grabbing select-none" : "cursor-grab"}`}
    >
      <div className="flex h-full gap-4">
        {etapas.map((etapa, idx) => {
          const daEtapa = itens.filter((i) => etapaDe(i) === etapa.codigo);
          const cor = corDaEtapa(etapa.codigo);
          return (
            <div
              key={etapa.codigo}
              onDragOver={(e) => {
                if (onMover && arrastando !== null) {
                  e.preventDefault();
                  setSobre(etapa.codigo);
                }
              }}
              onDragLeave={() => setSobre((s) => (s === etapa.codigo ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                soltar(etapa.codigo);
              }}
              className="flex h-full w-80 flex-shrink-0 flex-col overflow-visible rounded-xl border p-4 backdrop-blur-sm transition-colors"
              style={{
                backgroundColor: sobre === etapa.codigo ? `${cor}26` : `${cor}14`,
                borderColor: sobre === etapa.codigo ? cor : `${cor}50`,
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                <h3 className="truncate font-semibold text-slate-900 dark:text-white">{etapa.nome}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
                  {daEtapa.length}
                </span>
              </div>

              <div className="scrollbar-desktop min-h-0 flex-1 space-y-3 overflow-y-auto">
                {daEtapa.length > 0 ? (
                  daEtapa.map((item) => (
                    <div
                      key={idDe(item)}
                      data-card-parceria
                      draggable={!!onMover}
                      onDragStart={() => setArrastando(idDe(item))}
                      onDragEnd={() => {
                        setArrastando(null);
                        setSobre(null);
                      }}
                      onClick={() => onAbrir(item)}
                      className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/30 dark:bg-white/5"
                    >
                      {renderCard(item)}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum card nesta lista</div>
                )}
              </div>

              {rodapeColuna && daEtapa.length > 0 && rodapeColuna(daEtapa)}

              {idx === 0 && onAdicionar && (
                <div className="mt-3 flex flex-shrink-0">
                  <button
                    onClick={onAdicionar}
                    className="group flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <Plus size={16} className="transition-transform group-hover:scale-110" />
                    Adicionar card
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div className="w-1 flex-shrink-0" aria-hidden />
      </div>
    </div>
  );
}
