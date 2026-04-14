import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Phone, Star, User } from "lucide-react";
import callEvaluationService, { CallEvaluation, MatrixBlock } from "../../services/callEvaluationService";

interface CallEvaluationsSectionProps {
  cardId: number;
  onCountChange?: (count: number) => void;
}

export const classificationColor: Record<string, string> = {
  Excelente: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  Boa: "bg-blue-500/20 text-blue-600 border-blue-500/30 dark:text-blue-400",
  Regular: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  Fraca: "bg-orange-500/20 text-orange-600 border-orange-500/30 dark:text-orange-400",
  Crítica: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

const situationColor: Record<string, string> = {
  "Acompanhamento em aberto": "text-blue-500 dark:text-blue-400",
  "Oportunidade fechada": "text-emerald-600 dark:text-emerald-400",
  "Sem potencial": "text-slate-500 dark:text-slate-400",
};

export function ScoreBadge({ score, classification }: { score: number | null; classification: string | null }) {
  if (score === null) return null;
  const colorClass = classification
    ? classificationColor[classification] || "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30"
    : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      <Star size={11} />
      {score.toFixed(1)}/10 · {classification}
    </span>
  );
}

export function GradeBar({ grade }: { grade: number | null }) {
  if (grade === null) return <span className="text-xs text-slate-400 dark:text-slate-500">N/A</span>;
  const color = grade >= 7 ? "bg-emerald-500" : grade >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(grade / 10) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{grade}/10</span>
    </div>
  );
}

export function MatrixBlockItem({ block }: { block: MatrixBlock }) {
  const [expanded, setExpanded] = useState(false);
  const hasUncovered = block.uncovered_blocks && block.uncovered_blocks.length > 0;

  return (
    <div className={`overflow-hidden rounded-lg border ${block.not_applicable ? "border-gray-200/50 opacity-50 dark:border-slate-700/50" : "border-gray-200 dark:border-slate-700"} bg-gray-50 dark:bg-slate-800/50`}>
      <button
        onClick={() => !block.not_applicable && setExpanded(e => !e)}
        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left"
        disabled={block.not_applicable}
      >
        {/* Linha 1: nome do bloco + seta */}
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{block.block}</span>
          {!block.not_applicable && (
            expanded
              ? <ChevronUp size={14} className="shrink-0 text-slate-400" />
              : <ChevronDown size={14} className="shrink-0 text-slate-400" />
          )}
        </div>
        {/* Linha 2: badges + nota */}
        <div className="flex items-center gap-2">
          {block.not_applicable && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-500">N/A</span>
          )}
          {hasUncovered && !block.not_applicable && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-600 dark:text-orange-400">
              {block.uncovered_blocks.length} pendente{block.uncovered_blocks.length > 1 ? "s" : ""}
            </span>
          )}
          <GradeBar grade={block.grade} />
        </div>
      </button>

      {expanded && !block.not_applicable && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-300">{block.justification}</p>

          {hasUncovered && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Sub-blocos não cobertos</p>
              {block.uncovered_blocks.map((ub, i) => (
                <div key={i} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="mb-1 text-xs font-medium text-orange-600 dark:text-orange-400">{ub.name}</p>
                  <p className="text-xs text-slate-500 italic dark:text-slate-400">"{ub.suggestion}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EvaluationCard({ evaluation, onCardClick }: { evaluation: CallEvaluation; onCardClick?: (cardId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(evaluation.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/40">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/20"
      >
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge score={evaluation.final_score} classification={evaluation.classification} />
            {evaluation.situation && (
              <span className={`text-xs font-medium ${situationColor[evaluation.situation] || "text-slate-500 dark:text-slate-400"}`}>
                · {evaluation.situation}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 line-clamp-2 dark:text-slate-300">{evaluation.summary}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            {evaluation.vendedor_name && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {evaluation.vendedor_name}
                {evaluation.ramal && ` · ramal ${evaluation.ramal}`}
              </span>
            )}
            <span>{date}</span>
            {onCardClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onCardClick(evaluation.card_id); }}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ver card #{evaluation.card_id}
              </button>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="mt-1 flex-shrink-0 text-slate-400" />
          : <ChevronDown size={16} className="mt-1 flex-shrink-0 text-slate-400" />}
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-5 dark:border-slate-700">
          {/* Próximos passos */}
          {evaluation.next_steps && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-500 dark:text-blue-400">Próximos Passos</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{evaluation.next_steps}</p>
            </div>
          )}

          {/* Avaliação geral */}
          {evaluation.general_evaluation && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Avaliação Geral</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{evaluation.general_evaluation}</p>
            </div>
          )}

          {/* Matriz de blocos */}
          {evaluation.matrix_evaluation && evaluation.matrix_evaluation.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Avaliação por Blocos</p>
              {evaluation.matrix_evaluation.map((block, i) => (
                <MatrixBlockItem key={i} block={block} />
              ))}
            </div>
          )}

          {/* Transcrição */}
          {evaluation.transcript && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
                Ver transcrição completa
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-xs text-slate-600 font-sans leading-relaxed dark:bg-slate-900/50 dark:text-slate-400">
                {evaluation.transcript}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

const CallEvaluationsSection: React.FC<CallEvaluationsSectionProps> = ({ cardId, onCountChange }) => {
  const [evaluations, setEvaluations] = useState<CallEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callEvaluationService.listByCard(cardId)
      .then((data) => {
        setEvaluations(data);
        onCountChange?.(data.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 dark:text-slate-400">
        <span className="text-sm">Carregando avaliações...</span>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700/50">
          <Phone size={20} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma avaliação de ligação registrada.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">As avaliações aparecem aqui automaticamente após cada ligação processada pelo agente de IA.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500">{evaluations.length} avaliação{evaluations.length > 1 ? "ões" : ""} registrada{evaluations.length > 1 ? "s" : ""}</p>
      </div>
      {evaluations.map(evaluation => (
        <EvaluationCard key={evaluation.id} evaluation={evaluation} />
      ))}
    </div>
  );
};

export default CallEvaluationsSection;
