import React, { useState, useEffect } from "react";
import { Check, Loader2, Info } from "lucide-react";
import { List } from "../../types";
import listService from "../../services/listService";

interface PipelineStagesProps {
  boardId: number;
  currentListId: number;
  onMoveCard: (_listId: number) => void;
  isMoving?: boolean;
  // Quando true, esconde estágios terminais (Ganho/Perdido) do pipeline visual.
  // Usuários não privilegiados usam os botões dedicados para encerrar negócios.
  hideTerminalStages?: boolean;
}

/**
 * Componente de Pipeline Visual - Mostra todas as stages/listas do board
 * Indica visualmente a posição atual e as etapas já passadas
 */
const PipelineStages: React.FC<PipelineStagesProps> = ({
  boardId,
  currentListId,
  onMoveCard,
  isMoving = false,
  hideTerminalStages = false,
}) => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredListId, setHoveredListId] = useState<number | null>(null);

  // Carrega as listas do board
  useEffect(() => {
    loadLists();
  }, [boardId]);

  /**
   * Carrega todas as listas do board ordenadas por posição
   */
  const loadLists = async () => {
    try {
      setLoading(true);
      const allLists = await listService.list({ board_id: boardId });
      // Ordena por position e filtra terminais se necessário
      let sortedLists = allLists.sort((a, b) => a.position - b.position);
      if (hideTerminalStages) {
        sortedLists = sortedLists.filter((l) => !l.is_done_stage && !l.is_lost_stage);
      }
      setLists(sortedLists);
    } catch (error) {
      console.error("Erro ao carregar listas:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Determina a posição atual do card no pipeline
   */
  const getCurrentPosition = () => {
    return lists.findIndex((list) => list.id === currentListId);
  };

  /**
   * Retorna as classes CSS para cada stage baseado no status
   */
  const getStageClasses = (list: List, index: number) => {
    const currentPosition = getCurrentPosition();
    const isCurrent = list.id === currentListId;
    const isPassed = index < currentPosition;
    const isFuture = index > currentPosition;
    const isHovered = hoveredListId === list.id;

    // Stage atual (verde)
    if (isCurrent) {
      return {
        container: "bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30",
        text: "text-slate-900 dark:text-emerald-400 font-semibold",
        dot: "bg-emerald-500",
        icon: "text-emerald-400",
      };
    }

    // Stages já passadas (azul)
    if (isPassed) {
      return {
        container: isHovered
          ? "bg-blue-500/30 border-blue-500 cursor-pointer"
          : "bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20 cursor-pointer",
        text: isHovered ? "text-slate-900 dark:text-blue-300 font-medium" : "text-slate-900 dark:text-blue-400",
        dot: "bg-blue-500",
        icon: "text-blue-400",
      };
    }

    // Stages futuras (cinza)
    return {
      container: isHovered
        ? "bg-slate-600/30 border-gray-400 dark:border-slate-500 cursor-pointer"
        : "bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 cursor-pointer",
      text: isHovered ? "text-slate-900 dark:text-slate-300 font-medium" : "text-slate-900 dark:text-slate-400",
      dot: "bg-slate-600",
      icon: "text-slate-400 dark:text-slate-500",
    };
  };

  /**
   * Retorna as classes CSS para a linha conectora
   */
  const getLineClasses = (index: number) => {
    const currentPosition = getCurrentPosition();

    if (index < currentPosition) {
      // Linha entre stages já passadas (azul)
      return "bg-blue-500";
    } else if (index === currentPosition) {
      // Linha após a stage atual (gradiente)
      return "bg-gradient-to-r from-emerald-500 to-slate-700";
    } else {
      // Linha entre stages futuras (cinza)
      return "bg-gray-200 dark:bg-slate-700";
    }
  };

  /**
   * Handler para mover o card
   */
  const handleStageClick = (list: List) => {
    if (list.id !== currentListId) {
      onMoveCard(list.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-400">
        <div className="animate-pulse">Carregando pipeline...</div>
      </div>
    );
  }

  if (lists.length === 0) {
    return null;
  }

  /**
   * Verifica se o card está na última etapa visível do pipeline (sem próxima etapa disponível).
   * Quando hideTerminalStages=true, as etapas Ganho/Perdido são ocultadas, então
   * a última etapa visível é o "fim da linha" — o usuário só pode marcar como Ganho ou Perdido.
   */
  const isAtLastVisibleStage = () => {
    const currentPosition = getCurrentPosition();
    return currentPosition === lists.length - 1;
  };

  return (
    <div className="relative">
      {/* Overlay quando está movendo */}
      {isMoving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 font-medium text-blue-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Movendo card...</span>
          </div>
        </div>
      )}

      <div className={`scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 flex items-center gap-1 overflow-x-auto px-1 py-2 ${isMoving ? "pointer-events-none opacity-60" : ""}`}>
      {lists.map((list, index) => {
        const classes = getStageClasses(list, index);
        const currentPosition = getCurrentPosition();
        const isPassed = index < currentPosition;
        const isCurrent = list.id === currentListId;

        return (
          <React.Fragment key={list.id}>
            {/* Stage */}
            <button
              onClick={() => handleStageClick(list)}
              onMouseEnter={() => setHoveredListId(list.id)}
              onMouseLeave={() => setHoveredListId(null)}
              disabled={isCurrent}
              className={`
                relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-all
                ${classes.container}
                ${isCurrent ? "cursor-default" : ""}
              `}
              title={
                isCurrent
                  ? `Etapa atual: ${list.name}`
                  : `Mover para: ${list.name}`
              }
            >
              {/* Indicador visual (bolinha ou check) */}
              <div className="relative flex items-center justify-center">
                {isPassed || isCurrent ? (
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${classes.dot}`}
                  >
                    {isPassed && <Check size={12} className="text-slate-900 dark:text-white" />}
                    {isCurrent && (
                      <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    )}
                  </div>
                ) : (
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      hoveredListId === list.id ? "border-slate-400" : "border-gray-300 dark:border-slate-600"
                    }`}
                  />
                )}
              </div>

              {/* Nome da lista */}
              <span className={`whitespace-nowrap text-sm ${classes.text}`}>
                {list.name}
              </span>

              {/* Badge para stages especiais */}
              {list.is_done_stage && (
                <span className="ml-1 rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                  Ganho
                </span>
              )}
              {list.is_lost_stage && (
                <span className="ml-1 rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                  Perdido
                </span>
              )}
            </button>

            {/* Linha conectora entre stages */}
            {index < lists.length - 1 && (
              <div className="relative flex items-center">
                <div
                  className={`h-0.5 w-6 transition-all ${getLineClasses(index)}`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
      </div>

      {/* Aviso quando o card está na última etapa visível e não há para onde avançar */}
      {hideTerminalStages && isAtLastVisibleStage() && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Info size={14} className="flex-shrink-0 text-amber-400" />
          <p className="text-xs text-amber-400/90">
            Esta é a última etapa do pipeline. Para encerrar o negócio, use os botões
            <strong className="text-amber-400"> Ganho</strong> ou
            <strong className="text-amber-400"> Perdido</strong> acima.
          </p>
        </div>
      )}
    </div>
  );
};

export default PipelineStages;
