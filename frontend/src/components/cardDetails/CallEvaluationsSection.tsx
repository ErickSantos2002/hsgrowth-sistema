import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Phone, Star, AlertCircle, CheckCircle2, User } from "lucide-react";
import callEvaluationService, { CallEvaluation, MatrixBlock } from "../../services/callEvaluationService";

interface CallEvaluationsSectionProps {
  cardId: number;
}

const classificationColor: Record<string, string> = {
  Excelente: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Boa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Regular: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Fraca: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Crítica: "bg-red-500/20 text-red-400 border-red-500/30",
};

const situationColor: Record<string, string> = {
  "Acompanhamento em aberto": "text-blue-400",
  "Oportunidade fechada": "text-emerald-400",
  "Sem potencial": "text-slate-400",
};

function ScoreBadge({ score, classification }: { score: number | null; classification: string | null }) {
  if (score === null) return null;
  const colorClass = classification ? classificationColor[classification] || "bg-slate-500/20 text-slate-400 border-slate-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      <Star size={11} />
      {score.toFixed(1)}/10 · {classification}
    </span>
  );
}

function GradeBar({ grade }: { grade: number | null }) {
  if (grade === null) return <span className="text-xs text-slate-500">N/A</span>;
  const color = grade >= 7 ? "bg-emerald-500" : grade >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(grade / 10) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-300">{grade}/10</span>
    </div>
  );
}

function MatrixBlockItem({ block }: { block: MatrixBlock }) {
  const [expanded, setExpanded] = useState(false);
  const hasUncovered = block.uncovered_blocks && block.uncovered_blocks.length > 0;

  return (
    <div className={`rounded-lg border ${block.not_applicable ? "border-slate-700/50 opacity-50" : "border-slate-700"} bg-slate-800/50`}>
      <button
        onClick={() => !block.not_applicable && setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        disabled={block.not_applicable}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-200">{block.block}</span>
          {block.not_applicable && (
            <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-500">N/A</span>
          )}
          {hasUncovered && !block.not_applicable && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
              {block.uncovered_blocks.length} pendente{block.uncovered_blocks.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <GradeBar grade={block.grade} />
          {!block.not_applicable && (
            expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && !block.not_applicable && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-3">
          <p className="text-sm text-slate-300">{block.justification}</p>

          {hasUncovered && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sub-blocos não cobertos</p>
              {block.uncovered_blocks.map((ub, i) => (
                <div key={i} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="mb-1 text-xs font-medium text-orange-400">{ub.name}</p>
                  <p className="text-xs text-slate-400 italic">"{ub.suggestion}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: CallEvaluation }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(evaluation.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge score={evaluation.final_score} classification={evaluation.classification} />
            {evaluation.situation && (
              <span className={`text-xs font-medium ${situationColor[evaluation.situation] || "text-slate-400"}`}>
                · {evaluation.situation}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 line-clamp-2">{evaluation.summary}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {evaluation.vendedor_name && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {evaluation.vendedor_name}
                {evaluation.ramal && ` · ramal ${evaluation.ramal}`}
              </span>
            )}
            <span>{date}</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="mt-1 flex-shrink-0 text-slate-400" /> : <ChevronDown size={16} className="mt-1 flex-shrink-0 text-slate-400" />}
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-5">
          {/* Próximos passos */}
          {evaluation.next_steps && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-400">Próximos Passos</p>
              <p className="text-sm text-slate-300">{evaluation.next_steps}</p>
            </div>
          )}

          {/* Avaliação geral */}
          {evaluation.general_evaluation && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Avaliação Geral</p>
              <p className="text-sm text-slate-300">{evaluation.general_evaluation}</p>
            </div>
          )}

          {/* Matriz de blocos */}
          {evaluation.matrix_evaluation && evaluation.matrix_evaluation.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avaliação por Blocos</p>
              {evaluation.matrix_evaluation.map((block, i) => (
                <MatrixBlockItem key={i} block={block} />
              ))}
            </div>
          )}

          {/* Transcrição */}
          {evaluation.transcript && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors">
                Ver transcrição completa
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400 font-sans leading-relaxed">
                {evaluation.transcript}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

const CallEvaluationsSection: React.FC<CallEvaluationsSectionProps> = ({ cardId }) => {
  const [evaluations, setEvaluations] = useState<CallEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callEvaluationService.listByCard(cardId)
      .then(setEvaluations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <span className="text-sm">Carregando avaliações...</span>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50">
          <Phone size={20} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400">Nenhuma avaliação de ligação registrada.</p>
        <p className="text-xs text-slate-500">As avaliações aparecem aqui automaticamente após cada ligação processada pelo agente de IA.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{evaluations.length} avaliação{evaluations.length > 1 ? "ões" : ""} registrada{evaluations.length > 1 ? "s" : ""}</p>
      </div>
      {evaluations.map(evaluation => (
        <EvaluationCard key={evaluation.id} evaluation={evaluation} />
      ))}
    </div>
  );
};

export default CallEvaluationsSection;
