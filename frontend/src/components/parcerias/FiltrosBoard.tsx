import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SelectMenu } from "../common";

/**
 * Filtros dos boards de Parcerias, no mesmo desenho do painel dos boards de Serviço:
 * selects pequenos lado a lado, período com datas personalizadas e "Limpar filtros".
 * Tudo é filtrado na tela (a API já devolve só o que o login pode ver).
 */

export type Opcao = { value: string; label: string };
type Filtros = Record<string, string>;

/** Filtros guardados no navegador por board; sem armazenamento, só não lembra. */
export function useFiltrosSalvos<T extends Filtros>(chave: string, padrao: T) {
  const [f, setF] = useState<T>(() => {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) return { ...padrao, ...JSON.parse(salvo) };
    } catch {
      /* navegador sem armazenamento: começa limpo */
    }
    return padrao;
  });

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(f));
    } catch {
      /* idem */
    }
  }, [chave, f]);

  const mudar = (campo: keyof T, valor: string) => setF((atual) => ({ ...atual, [campo]: valor }));
  const limpar = () => setF(padrao);
  const ativos = (Object.keys(padrao) as (keyof T)[]).some((k) => f[k] !== padrao[k]);
  return { f, mudar, limpar, ativos };
}

/** Opções sem repetição, em ordem alfabética, a partir de pares id/nome. */
export function opcoesUnicas(pares: [number | null | undefined, string | null | undefined][]): Opcao[] {
  const mapa = new Map<string, string>();
  pares.forEach(([id, nome]) => {
    if (id != null && nome) mapa.set(String(id), nome);
  });
  return [...mapa].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/** Situação das atividades do card (a mesma etiqueta dos boards de Serviço). */
export const OPCOES_ETIQUETA: Opcao[] = [
  { value: "", label: "Todas as etiquetas" },
  { value: "overdue", label: "Atividade atrasada" },
  { value: "today", label: "Atividade para hoje" },
  { value: "future", label: "Atividade futura" },
  { value: "none", label: "Sem atividade" },
];

const PERIODOS: Opcao[] = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "ano", label: "Este ano" },
  { value: "custom", label: "Período personalizado" },
];

const DIA = 86_400_000;

/** Data da API: "aaaa-mm-dd" (dia) ou data e hora em UTC sem fuso. */
function lerData(iso: string): Date {
  if (iso.length === 10) return new Date(`${iso}T00:00:00`);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

/** A data cai no período escolhido? Sem período, tudo passa; sem data, nada passa. */
export function noPeriodo(iso: string | null | undefined, periodo: string, de: string, ate: string): boolean {
  if (!periodo) return true;
  if (!iso) return false;
  const d = lerData(iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  let inicio: Date;
  let fim: Date; // exclusivo
  switch (periodo) {
    case "semana":
      inicio = new Date(hoje.getTime() - hoje.getDay() * DIA);
      fim = new Date(inicio.getTime() + 7 * DIA);
      break;
    case "mes":
      inicio = new Date(ano, mes, 1);
      fim = new Date(ano, mes + 1, 1);
      break;
    case "mes_passado":
      inicio = new Date(ano, mes - 1, 1);
      fim = new Date(ano, mes, 1);
      break;
    case "3meses":
      inicio = new Date(ano, mes - 2, 1);
      fim = new Date(ano, mes + 1, 1);
      break;
    case "ano":
      inicio = new Date(ano, 0, 1);
      fim = new Date(ano + 1, 0, 1);
      break;
    default: // custom
      inicio = de ? new Date(`${de}T00:00:00`) : new Date(0);
      fim = ate ? new Date(new Date(`${ate}T00:00:00`).getTime() + DIA) : new Date(8.64e15);
  }
  return d >= inicio && d < fim;
}

/** Um select do painel. */
export function FiltroSelect({ valor, onChange, opcoes, largura = "min-w-[170px]" }: {
  valor: string;
  onChange: (v: string) => void;
  opcoes: Opcao[];
  largura?: string;
}) {
  return (
    <div className={largura}>
      <SelectMenu size="sm" value={valor} onChange={onChange} options={opcoes} listaAjustada />
    </div>
  );
}

const CAMPO_DATA = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";

/** Período (select) com as datas quando é personalizado. */
export function FiltroPeriodo({ rotulo, periodo, de, ate, onPeriodo, onDe, onAte }: {
  /** Texto do "qualquer", ex.: "Qualquer criação". */
  rotulo: string;
  periodo: string;
  de: string;
  ate: string;
  onPeriodo: (v: string) => void;
  onDe: (v: string) => void;
  onAte: (v: string) => void;
}) {
  return (
    <>
      <FiltroSelect
        valor={periodo}
        onChange={(v) => {
          onPeriodo(v);
          if (v !== "custom") { onDe(""); onAte(""); }
        }}
        opcoes={[{ value: "", label: rotulo }, ...PERIODOS]}
      />
      {periodo === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={de} max={ate || undefined} onChange={(e) => onDe(e.target.value)} className={CAMPO_DATA} />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" value={ate} min={de || undefined} onChange={(e) => onAte(e.target.value)} className={CAMPO_DATA} />
        </div>
      )}
    </>
  );
}

/** A faixa do painel, abaixo do cabeçalho do board. */
export function PainelFiltros({ ativos, onLimpar, children }: {
  ativos: boolean;
  onLimpar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-slate-700/50">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Filtros:</span>
      {children}
      {ativos && (
        <button onClick={onLimpar} className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300">
          <X size={14} /> Limpar filtros
        </button>
      )}
    </div>
  );
}
