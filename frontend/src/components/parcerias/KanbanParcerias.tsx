import React, { useRef, useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { UserAvatar } from "../common";
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
  /** Cards que não se arrastam (ex.: oportunidade de empresa indicada, só leitura). Ausente = todos. */
  podeArrastar?: (item: T) => boolean;
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

type Pendencia = "overdue" | "today" | "future" | "none" | null | undefined;

const PENDENCIA: Record<string, { bolinha: string; badge: string; label: string; dica: string }> = {
  overdue: { bolinha: "bg-red-500/20 text-red-400", badge: "bg-red-500/15 text-red-500 dark:text-red-400", label: "Atrasada", dica: "atrasada(s)" },
  today: { bolinha: "bg-green-500/20 text-green-400", badge: "bg-green-500/15 text-green-600 dark:text-green-400", label: "Para Hoje", dica: "para hoje" },
  future: { bolinha: "bg-purple-500/20 text-purple-400", badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400", label: "Futura", dica: "futura(s)" },
};

interface CardPadraoProps {
  titulo: string;
  linhas: (string | null | undefined)[];
  pendencia: Pendencia;
  quantidade?: number;
  badges?: React.ReactNode;
  valor?: string;
  pessoas?: (string | null | undefined)[];
}

/**
 * Card no mesmo desenho dos boards de Vendas e Serviço: bolinha de atividade no canto,
 * título em até 2 linhas, linhas de apoio, badges e rodapé com valor e avatares.
 * As linhas vazias seguram o espaço para todos os cards terem a mesma altura.
 */
export function CardPadrao({ titulo, linhas, pendencia, quantidade = 0, badges, valor, pessoas = [] }: CardPadraoProps) {
  const p = pendencia ? PENDENCIA[pendencia] : undefined;
  return (
    <>
      <div
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${p?.bolinha ?? "bg-gray-100 text-slate-400 dark:bg-slate-700/40 dark:text-slate-500"}`}
        title={p ? `${quantidade} atividade(s) ${p.dica}` : "Sem atividades pendentes"}
      >
        <CheckSquare size={13} />
      </div>
      <h4 className="mb-1.5 line-clamp-2 min-h-[2.5rem] pr-9 text-sm font-medium leading-snug text-slate-900 dark:text-white">{titulo}</h4>
      {linhas.map((linha, i) => (
        <p key={i} className={`mb-0.5 truncate text-xs ${i === 0 ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
          {linha || "\u00a0"}
        </p>
      ))}
      <div className="mb-2 mt-1.5 flex flex-wrap gap-1.5">
        {p ? (
          <CardBadge cls={p.badge} icon={<CheckSquare size={11} />} label={p.label} />
        ) : (
          <CardBadge cls="bg-slate-500/10 text-slate-400 dark:text-slate-500" icon={<CheckSquare size={11} />} label="Sem Atividade" />
        )}
        {badges}
      </div>
      <div className="mt-auto flex min-h-[1.5rem] items-center justify-between text-xs">
        <span className="font-medium text-green-500 dark:text-green-400">{valor ?? ""}</span>
        <div className="flex items-center gap-1">
          {pessoas.filter(Boolean).map((nome, i) => (
            <span key={i} title={nome!}>
              <UserAvatar userName={nome!} size="xs" className="shrink-0" />
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export default function KanbanParcerias<T>({
  etapas, itens, idDe, etapaDe, renderCard, onAbrir, onMover, podeArrastar, onAdicionar, rodapeColuna,
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
    if (item && onMover && (!podeArrastar || podeArrastar(item)) && etapaDe(item) !== destino) onMover(item, destino);
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
                      draggable={!!onMover && (!podeArrastar || podeArrastar(item))}
                      onDragStart={() => setArrastando(idDe(item))}
                      onDragEnd={() => {
                        setArrastando(null);
                        setSobre(null);
                      }}
                      onClick={() => onAbrir(item)}
                      className="group relative flex min-h-[156px] cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md dark:border-slate-700/30 dark:bg-white/5 dark:hover:border-slate-600 dark:hover:bg-white/10"
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
