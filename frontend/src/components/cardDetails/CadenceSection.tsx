import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  ListOrdered,
  CheckCircle2,
  Clock,
} from "lucide-react";
import cadenceService, {
  CardCadence,
  CadenceTemplate,
  ACTIVITY_TYPE_LABELS,
} from "../../services/cadenceService";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface CadenceSectionProps {
  cardId: number;
  readOnly?: boolean;
  onUpdate?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  normal: "text-blue-400",
  high: "text-yellow-400",
  urgent: "text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const CadenceSection: React.FC<CadenceSectionProps> = ({ cardId, readOnly = false, onUpdate }) => {
  const { confirm } = useConfirm();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cadence, setCadence] = useState<CardCadence | null>(null);

  // Para o modal de iniciar cadência
  const [showStartModal, setShowStartModal] = useState(false);
  const [templates, setTemplates] = useState<CadenceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadCadence();
  }, [cardId]);

  const loadCadence = async () => {
    setLoading(true);
    try {
      const data = await cadenceService.getCardCadence(cardId);
      setCadence(data);
      if (data) setIsExpanded(true);
    } catch {
      // silencioso — sem cadência é normal
    } finally {
      setLoading(false);
    }
  };

  const openStartModal = async () => {
    setShowStartModal(true);
    setLoadingTemplates(true);
    try {
      const data = await cadenceService.listTemplates(true);
      setTemplates(data);
      if (data.length > 0) setSelectedTemplateId(data[0].id);
    } catch {
      showError("Erro ao carregar templates de cadência.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!selectedTemplateId) return;
    setActionLoading(true);
    try {
      const data = await cadenceService.startCadence(cardId, selectedTemplateId);
      setCadence(data);
      setShowStartModal(false);
      setIsExpanded(true);
      showSuccess("Cadência iniciada!");
      onUpdate?.();
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao iniciar cadência.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const data = await cadenceService.pauseCadence(cardId);
      setCadence(data);
      showSuccess("Cadência pausada. A próxima atividade não será criada automaticamente.");
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao pausar cadência.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const data = await cadenceService.resumeCadence(cardId);
      setCadence(data);
      showSuccess("Cadência retomada! A próxima atividade foi criada.");
      onUpdate?.();
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao retomar cadência.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancelar cadência",
      message: "Tem certeza que deseja cancelar a cadência? As atividades já criadas permanecem, mas nenhuma nova será gerada.",
      confirmText: "Cancelar cadência",
      isDanger: true,
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      const data = await cadenceService.cancelCadence(cardId);
      setCadence(data);
      showSuccess("Cadência cancelada.");
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao cancelar cadência.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasCadence = cadence && (cadence.status === "active" || cadence.status === "paused");
  const progress = cadence ? Math.round(((cadence.current_step_order - 1) / cadence.total_steps) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
      {/* Header da seção */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ListOrdered size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cadência</span>
          {hasCadence && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              cadence.status === "active"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {STATUS_LABELS[cadence.status]}
            </span>
          )}
          {cadence?.status === "completed" && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
              Concluída
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={15} className="text-slate-400" />
        ) : (
          <ChevronRight size={15} className="text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-4 pb-4 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : !hasCadence && cadence?.status !== "completed" ? (
            /* Nenhuma cadência ativa */
            <div className="text-center py-4">
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma cadência ativa neste lead.
              </p>
              {!readOnly && (
                <button
                  onClick={openStartModal}
                  className="flex items-center gap-2 mx-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Play size={14} />
                  Iniciar Cadência
                </button>
              )}
            </div>
          ) : cadence?.status === "completed" ? (
            /* Cadência concluída */
            <div className="text-center py-4">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Cadência "{cadence.template_name}" concluída!
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Todas as {cadence.total_steps} etapas foram realizadas.
              </p>
              {!readOnly && (
                <button
                  onClick={openStartModal}
                  className="mt-3 flex items-center gap-2 mx-auto rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                >
                  <Play size={12} />
                  Iniciar nova cadência
                </button>
              )}
            </div>
          ) : (
            /* Cadência ativa ou pausada */
            <div className="space-y-3">
              {/* Nome e progresso */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {cadence!.template_name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Etapa {cadence!.current_step_order} de {cadence!.total_steps}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Etapa atual */}
              {cadence!.current_step && (
                <div className={`rounded-lg border px-3 py-2 ${
                  cadence!.status === "paused"
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                    {cadence!.status === "paused" ? "Pausada em" : "Etapa atual"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="flex-shrink-0 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {cadence!.current_step.title}
                    </span>
                    <span className={`ml-auto text-xs ${PRIORITY_COLORS[cadence!.current_step.priority] || PRIORITY_COLORS.normal}`}>
                      {ACTIVITY_TYPE_LABELS[cadence!.current_step.activity_type] || cadence!.current_step.activity_type}
                    </span>
                  </div>
                  {cadence!.current_step.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {cadence!.current_step.description}
                    </p>
                  )}
                </div>
              )}

              {/* Aviso de pausa */}
              {cadence!.status === "paused" && (
                <p className="text-xs text-yellow-500 dark:text-yellow-400">
                  Cadência pausada — conclua a atividade atual e retome para criar a próxima automaticamente.
                </p>
              )}

              {/* Botões de ação */}
              {!readOnly && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {cadence!.status === "active" ? (
                    <button
                      onClick={handlePause}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
                      Pausar
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Retomar
                    </button>
                  )}
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <X size={12} />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de seleção de template para iniciar */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Iniciar Cadência</h3>
              <button onClick={() => setShowStartModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : templates.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhum template de cadência disponível. Peça ao administrador para criar um em Configurações → Cadências.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Selecione qual cadência iniciar neste lead:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                          selectedTemplateId === t.id
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-gray-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900 dark:text-white">{t.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t.steps.length} etapa{t.steps.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {t.description && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {templates.length > 0 && (
              <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 px-5 py-4">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStart}
                  disabled={!selectedTemplateId || actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Iniciar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CadenceSection;
