import React from "react";
import { Check } from "lucide-react";
import type { Etapa } from "../../services/parceriasService";

interface Props {
  etapas: Etapa[];
  atual: string;
  /** Etapas que não se escolhem por aqui (Ganho/Perdido vão pelos botões; Ativado é automático). */
  fixas: string[];
  onMover?: (destino: string) => void;
}

/** Trilha de etapas do detalhe, igual à do card de Serviço. */
export default function EtapasParceria({ etapas, atual, fixas, onMover }: Props) {
  // O Perdido fica fora da trilha: aparece como selo no cabeçalho.
  const trilha = etapas.filter((e) => e.codigo !== "perdido");
  const posicao = trilha.findIndex((e) => e.codigo === atual);

  return (
    <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto px-1 py-2">
      {trilha.map((etapa, index) => {
        const ehAtual = etapa.codigo === atual;
        const passou = posicao >= 0 && index < posicao;
        const fixa = fixas.includes(etapa.codigo);
        const bloqueada = ehAtual || fixa || !onMover;
        const caixa = ehAtual
          ? "bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30"
          : passou
          ? "bg-blue-500/10 border-blue-500/50"
          : "bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700";
        const texto = ehAtual
          ? "text-slate-900 dark:text-emerald-400 font-semibold"
          : passou
          ? "text-slate-900 dark:text-blue-400"
          : "text-slate-900 dark:text-slate-400";
        const linha = index < posicao
          ? "bg-blue-500"
          : index === posicao
          ? "bg-gradient-to-r from-emerald-500 to-slate-700"
          : "bg-gray-200 dark:bg-slate-700";

        return (
          <React.Fragment key={etapa.codigo}>
            <button
              onClick={() => { if (!bloqueada) onMover?.(etapa.codigo); }}
              disabled={bloqueada}
              className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 ${caixa} ${
                ehAtual ? "cursor-not-allowed" : fixa || !onMover ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
              title={ehAtual ? `Etapa atual: ${etapa.nome}` : fixa ? `"${etapa.nome}" não se escolhe por aqui` : `Mover para: ${etapa.nome}`}
            >
              {passou || ehAtual ? (
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${ehAtual ? "bg-emerald-500" : "bg-blue-500"}`}>
                  {passou && <Check size={12} className="text-slate-900 dark:text-white" />}
                  {ehAtual && <div className="h-2 w-2 animate-pulse rounded-full bg-white" />}
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-slate-600" />
              )}
              <span className={`whitespace-nowrap text-sm ${texto}`}>{etapa.nome}</span>
            </button>
            {index < trilha.length - 1 && <div className={`h-0.5 w-6 transition-all ${linha}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
