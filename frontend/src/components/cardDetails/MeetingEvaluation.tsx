import { useState } from "react";
import { ChevronRight, Target, TrendingUp, Trophy } from "lucide-react";

import { AvaliacaoDaReuniao } from "../../services/cardTaskService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

const corDoVeredito = (veredito: string | null) => {
  if (!veredito) return "text-slate-400 border-slate-600/50";
  if (veredito.startsWith("Call padrão ouro")) return "text-emerald-400 border-emerald-500/40";
  if (veredito.startsWith("Boa call")) return "text-sky-400 border-sky-500/40";
  if (veredito.startsWith("Call frágil")) return "text-amber-400 border-amber-500/40";
  return "text-slate-300 border-slate-600/50";
};

const corDaNota = (nota: number | null) => {
  if (nota === null) return "text-slate-500";
  if (nota === 2) return "text-emerald-400";
  if (nota === 1) return "text-amber-400";
  return "text-red-400";
};

/**
 * A avaliação da reunião pela régua da consultoria.
 *
 * Os três textos primeiro, os 26 critérios fechados: o vendedor lê o retorno
 * em dez segundos e só abre a régua se quiser entender de onde veio a nota.
 * Começar pelo ponto forte é o que faz ele ler o resto.
 */
const MeetingEvaluation: React.FC<{ avaliacao: AvaliacaoDaReuniao }> = ({ avaliacao }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="space-y-2.5 rounded border border-slate-700/50 bg-slate-800/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">Avaliação da reunião</span>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-medium ${corDoVeredito(
            avaliacao.veredito
          )}`}
        >
          {avaliacao.score !== null ? `${avaliacao.score} · ` : ""}
          {avaliacao.veredito}
        </span>
      </div>

      {avaliacao.medias_por_bloco && (
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
          {BLOCOS.filter((b) => avaliacao.medias_por_bloco?.[b] !== undefined).map((bloco) => (
            <span key={bloco} className="rounded bg-slate-700/40 px-1.5 py-0.5">
              {bloco} {avaliacao.medias_por_bloco?.[bloco]}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Cobertura {Math.round((avaliacao.cobertura ?? 0) * 100)}% · avaliada em{" "}
        {new Date(avaliacao.avaliado_em).toLocaleDateString("pt-BR")}
        {avaliacao.avaliado_por ? ` por ${avaliacao.avaliado_por}` : ""}
      </p>

      <div className="space-y-1.5 text-xs">
        {avaliacao.ponto_forte && (
          <p className="flex gap-1.5 text-slate-200">
            <Trophy size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>
              <span className="text-slate-400">Ponto forte · </span>
              {avaliacao.ponto_forte}
            </span>
          </p>
        )}
        {avaliacao.foco_desenvolvimento && (
          <p className="flex gap-1.5 text-slate-200">
            <TrendingUp size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
            <span>
              <span className="text-slate-400">Desenvolver · </span>
              {avaliacao.foco_desenvolvimento}
            </span>
          </p>
        )}
        {avaliacao.proxima_acao && (
          <p className="flex gap-1.5 text-slate-200">
            <Target size={13} className="mt-0.5 flex-shrink-0 text-sky-400" />
            <span>
              <span className="text-slate-400">Próxima ação · </span>
              {avaliacao.proxima_acao}
            </span>
          </p>
        )}
      </div>

      <button
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-slate-200"
      >
        <ChevronRight
          size={11}
          className={`transition-transform ${aberto ? "rotate-90" : ""}`}
        />
        {aberto ? "Fechar os critérios" : `Ver os ${avaliacao.itens.length} critérios`}
      </button>

      {aberto && (
        <div className="space-y-2.5 pt-1">
          {BLOCOS.map((bloco) => {
            const doBloco = avaliacao.itens.filter((i) => i.bloco === bloco);
            if (doBloco.length === 0) return null;
            return (
              <div key={bloco} className="space-y-1">
                <p className="text-[11px] font-medium text-slate-400">{bloco}</p>
                {doBloco.map((item) => (
                  <div key={item.criterio_id} className="rounded bg-slate-900/40 p-1.5 text-[11px]">
                    <p className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-500">{item.criterio_id}</span>
                      <span className="text-slate-400">peso {item.peso}</span>
                      <span className={corDaNota(item.nota)}>
                        {item.nota === null ? "não se aplica" : `nota ${item.nota}`}
                      </span>
                    </p>
                    {item.porque && <p className="text-slate-300">{item.porque}</p>}
                    {item.evidencia && (
                      <p className="mt-0.5 border-l-2 border-slate-700 pl-1.5 italic text-slate-400">
                        "{item.evidencia}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MeetingEvaluation;
