import React, { useState, useEffect, useRef } from "react";
import { X, Trophy } from "lucide-react";
import { CardTask } from "../../services/cardTaskService";
import cardService from "../../services/cardService";
import cardNoteService, { CardNote } from "../../services/cardNoteService";
import { Card } from "../../types";
import { useActivityActions } from "../../hooks/useActivityActions";
import { Button } from "../common";
import FocusModeCard from "./FocusModeCard";

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  /** Snapshot das atividades no momento de abertura da sessão */
  tasks: CardTask[];
  /** Chamado ao fechar a tela de conclusão — dispara reload da listagem */
  onSessionEnd: () => void;
  isViewer: boolean;
}

/**
 * Modal fullscreen de foco para trabalhar nas atividades em sequência.
 *
 * Features:
 * - Navegação anterior/próximo entre atividades
 * - Barra de progresso proporcional ao índice atual
 * - Cache de cards para evitar rebuscar o mesmo card
 * - Contadores de concluídas, reagendadas e puladas
 * - Tela de conclusão ao final da sessão (Trophy)
 */
const FocusMode: React.FC<FocusModeProps> = ({
  isOpen,
  onClose,
  tasks,
  onSessionEnd,
  isViewer,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Fila de trabalho — começa como cópia das tasks e vai sendo reduzida conforme processadas
  const [queue, setQueue] = useState<CardTask[]>([]);
  // Cache de cards e anotações por card_id para evitar rebuscas desnecessárias
  const cardCache = useRef<Map<number, Card>>(new Map());
  const notesCache = useRef<Map<number, CardNote[]>>(new Map());
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [currentNotes, setCurrentNotes] = useState<CardNote[]>([]);
  const [loadingCard, setLoadingCard] = useState(false);

  // Contadores da sessão
  const [completedCount, setCompletedCount] = useState(0);
  const [rescheduledCount, setRescheduledCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Indica que todas as atividades foram processadas
  const [sessionDone, setSessionDone] = useState(false);

  const totalTasks = queue.length;
  const currentTask = queue[currentIndex];

  // ─── Carregamento do card com cache ──────────────────────────────────────────

  useEffect(() => {
    if (!currentTask || sessionDone) return;

    const cardId = currentTask.card_id;

    // Se já está no cache, usa direto
    if (cardCache.current.has(cardId)) {
      setCurrentCard(cardCache.current.get(cardId)!);
      setCurrentNotes(notesCache.current.get(cardId) ?? []);
      return;
    }

    // Busca card e anotações em paralelo, guarda no cache
    setLoadingCard(true);
    setCurrentCard(null);
    setCurrentNotes([]);
    Promise.all([
      cardService.getById(cardId),
      cardNoteService.getByCard(cardId),
    ])
      .then(([card, notes]) => {
        cardCache.current.set(cardId, card);
        notesCache.current.set(cardId, notes);
        setCurrentCard(card);
        setCurrentNotes(notes);
      })
      .catch(console.error)
      .finally(() => setLoadingCard(false));
  }, [currentIndex, currentTask?.id, sessionDone]);

  // Reseta o estado quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setQueue([...tasks]);
      setCurrentIndex(0);
      setCompletedCount(0);
      setRescheduledCount(0);
      setSkippedCount(0);
      setSessionDone(false);
      cardCache.current = new Map();
      notesCache.current = new Map();
    }
  }, [isOpen]);

  // ─── Helpers de navegação ────────────────────────────────────────────────────

  /**
   * Remove a tarefa atual da fila (processada: concluída/reagendada/noshow).
   * O índice permanece o mesmo — o próximo item desloca para o lugar.
   * Se era o último, encerra a sessão.
   */
  const removeCurrentAndAdvance = () => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== currentIndex);
      if (next.length === 0) {
        setSessionDone(true);
      } else {
        // Mantém o índice apontando para o próximo item (que deslizou para cá)
        // ou recua se era o último
        setCurrentIndex((i) => Math.min(i, next.length - 1));
      }
      return next;
    });
  };

  /** Avança sem remover (pular) — ou encerra se for o último */
  const goNext = () => {
    if (currentIndex < totalTasks - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setSessionDone(true);
    }
  };

  // ─── Hook de ações — callbacks incrementam contadores ────────────────────────

  const actions = useActivityActions({
    onSuccess: () => {
      // Ao concluir/reagendar/excluir, avança automaticamente para a próxima
      // O tipo de ação determina qual contador incrementar
    },
    isViewer,
  });

  /**
   * Wrapper de concluir: incrementa contador e avança.
   * Aceita taskId para manter a assinatura compatível com ActivityActionsResult.
   */
  const handleComplete = async (_taskId: number) => {
    await actions.handleToggleComplete(currentTask.id);
    setCompletedCount((c) => c + 1);
    removeCurrentAndAdvance();
  };

  /**
   * Wrapper de reagendar: remove da fila (já foi tratada).
   */
  const handleReschedule = async (taskId: number, date: string, time: string) => {
    await actions.handleReschedule(taskId, date, time);
    setRescheduledCount((c) => c + 1);
    removeCurrentAndAdvance();
  };

  /**
   * Wrapper de pular: avança sem remover — tarefa permanece na fila.
   */
  const handleSkip = () => {
    setSkippedCount((c) => c + 1);
    goNext();
  };

  /**
   * Atualiza a tarefa na fila após edição inline.
   */
  const handleUpdateTask = (updated: CardTask) => {
    setQueue((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  /**
   * Wrapper de noshow: remove da fila.
   */
  const handleNoShow = async (taskId: number, cardId: number) => {
    await actions.handleNoShow(taskId, cardId);
    setCompletedCount((c) => c + 1);
    removeCurrentAndAdvance();
  };

  // Cria um conjunto de ações personalizado para o FocusMode com os wrappers acima
  const focusActions = {
    ...actions,
    handleToggleComplete: handleComplete,
    handleReschedule,
    handleNoShow,
  };

  // ─── Render — retorna null se fechado ────────────────────────────────────────

  if (!isOpen) return null;

  // Progresso: percentual baseado no índice atual
  const progressPercent = totalTasks > 0 ? ((currentIndex) / totalTasks) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[2500] flex flex-col bg-gray-50 dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700/50 dark:bg-slate-900">
        {/* Título e contador */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Atividades
          </span>
          {!sessionDone && totalTasks > 0 && (
            <div className="flex w-full max-w-xs items-center gap-2">
              <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {currentIndex + 1} de {totalTasks}
              </span>
              {/* Barra de progresso */}
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botão Fechar */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          title="Fechar modo de foco"
          icon={<X size={20} />}
          className="flex-shrink-0"
        />
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {sessionDone ? (
          // Tela de conclusão
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
              <Trophy size={40} className="text-yellow-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
              Sessão concluída!
            </h2>
            <p className="mb-6 text-slate-500 dark:text-slate-400">
              Você passou por todas as {totalTasks} atividades.
            </p>
            {/* Contadores da sessão */}
            <div className="mb-8 flex gap-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-emerald-500">{completedCount}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Concluídas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-yellow-500">{rescheduledCount}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Reagendadas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-slate-400">{skippedCount}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Puladas</span>
              </div>
            </div>
            <button
              onClick={() => {
                onSessionEnd();
                onClose();
              }}
              className="rounded-xl bg-blue-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
            >
              Fechar
            </button>
          </div>
        ) : totalTasks === 0 ? (
          // Sem atividades
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">
              Nenhuma atividade para exibir.
            </p>
          </div>
        ) : (
          // Card da atividade atual
          <div className="mx-auto h-full max-w-5xl">
            <FocusModeCard
              task={currentTask}
              cardInfo={currentCard}
              cardNotes={currentNotes}
              loadingCard={loadingCard}
              isViewer={isViewer}
              actions={focusActions}
              onSkip={handleSkip}
              onUpdate={handleUpdateTask}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusMode;
