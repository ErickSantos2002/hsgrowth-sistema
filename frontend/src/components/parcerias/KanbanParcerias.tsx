import React, { useState } from "react";
import type { Etapa } from "../../services/parceriasService";

interface Props<T> {
  etapas: Etapa[];
  itens: T[];
  idDe: (item: T) => number;
  etapaDe: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onAbrir: (item: T) => void;
  /** Ausente = só leitura (Financeiro). */
  onMover?: (item: T, destino: string) => void;
}

export default function KanbanParcerias<T>({ etapas, itens, idDe, etapaDe, renderCard, onAbrir, onMover }: Props<T>) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const soltar = (destino: string) => {
    const item = itens.find((i) => idDe(i) === arrastando);
    setArrastando(null);
    setSobre(null);
    if (item && onMover && etapaDe(item) !== destino) onMover(item, destino);
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {etapas.map((etapa) => {
        const daEtapa = itens.filter((i) => etapaDe(i) === etapa.codigo);
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
            className={`flex w-72 flex-shrink-0 flex-col rounded-xl border bg-gray-100/60 dark:bg-slate-800/40 ${
              sobre === etapa.codigo ? "border-emerald-500" : "border-gray-200 dark:border-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{etapa.nome}</h3>
              <span className="rounded-full bg-gray-200 px-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {daEtapa.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {daEtapa.map((item) => (
                <div
                  key={idDe(item)}
                  draggable={!!onMover}
                  onDragStart={() => setArrastando(idDe(item))}
                  onDragEnd={() => {
                    setArrastando(null);
                    setSobre(null);
                  }}
                  onClick={() => onAbrir(item)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
