import { useState } from "react";
import cardTaskService, { CardTask } from "../services/cardTaskService";
import api4comService from "../services/api4comService";
import personService, { Person } from "../services/personService";
import automationService from "../services/automationService";
import { Card } from "../types";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import { convertBrazilToUTC } from "../utils/timezone";

/**
 * Tipos de ação disponíveis para controle de loading granular por task.
 * Cada chave representa uma ação em andamento para um task específico.
 */
type ActionType = "complete" | "reschedule" | "delete" | "call" | "noshow";

/**
 * Estado de loading por task ID: mapeia id -> tipo de ação em progresso.
 * undefined = sem ação em progresso para aquele ID.
 */
type LoadingStates = Record<number, ActionType | undefined>;

/**
 * Estado do modal de seleção de número telefônico.
 * Inclui a pessoa carregada para exibir os números disponíveis.
 */
export interface PhoneSelectState {
  taskId: number;
  cardId: number;
  person: Person;
}

/**
 * Retorno do hook useActivityActions.
 * Expõe handlers e estado de loading para uso em listagem e FocusMode.
 */
export interface ActivityActionsResult {
  loadingStates: LoadingStates;
  handleToggleComplete: (taskId: number) => Promise<void>;
  handleReschedule: (taskId: number, date: string, time: string) => Promise<void>;
  handleMakeCall: (task: CardTask, cardInfo: Card | null) => Promise<void>;
  handleNoShow: (taskId: number, cardId: number) => Promise<void>;
  handleDelete: (taskId: number) => Promise<void>;
  /** Estado do modal de seleção de número telefônico */
  phoneSelectState: PhoneSelectState | null;
  setPhoneSelectState: (state: PhoneSelectState | null) => void;
  /** Executa a chamada para um número já selecionado pelo usuário */
  executeCall: (taskId: number, phone: string, cardId: number) => Promise<void>;
}

/**
 * Props do hook.
 */
interface UseActivityActionsProps {
  /** Callback chamado após qualquer ação bem-sucedida (ex: recarregar lista) */
  onSuccess: () => void;
  /** Se true, bloqueia todas as ações de escrita (usuário viewer) */
  isViewer?: boolean;
}

/**
 * Hook central para ações sobre atividades/tarefas.
 *
 * Elimina duplicação entre a listagem de atividades e o FocusMode.
 * Gerencia loading granular por task ID e tipo de ação.
 *
 * Ações disponíveis:
 * - handleToggleComplete: Marca atividade como concluída
 * - handleReschedule: Reagenda para nova data/hora
 * - handleMakeCall: Inicia chamada via API4COM (busca pessoa do card automaticamente)
 * - handleNoShow: Marca reunião como NoShow e dispara automação ID 12
 * - handleDelete: Exclui a atividade com confirmação
 */
export function useActivityActions({ onSuccess, isViewer = false }: UseActivityActionsProps): ActivityActionsResult {
  const { confirm } = useConfirm();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [phoneSelectState, setPhoneSelectState] = useState<PhoneSelectState | null>(null);

  /**
   * Ativa o loading para uma task específica.
   */
  const setLoading = (taskId: number, action: ActionType | undefined) => {
    setLoadingStates((prev) => ({ ...prev, [taskId]: action }));
  };

  /**
   * Marca atividade como concluída.
   */
  const handleToggleComplete = async (taskId: number, isValid: boolean = true): Promise<void> => {
    if (isViewer) return;

    try {
      setLoading(taskId, "complete");
      await cardTaskService.toggleComplete(taskId, true, isValid);
      showSuccess(isValid ? "Atividade concluída como válida!" : "Atividade marcada como não válida.");
      onSuccess();
    } catch (error) {
      console.error("Erro ao concluir atividade:", error);
      showError("Erro ao concluir atividade");
    } finally {
      setLoading(taskId, undefined);
    }
  };

  /**
   * Reagenda uma atividade para nova data/hora.
   * Converte a data/hora do Brasil para UTC antes de enviar ao backend.
   */
  const handleReschedule = async (taskId: number, date: string, time: string): Promise<void> => {
    if (isViewer) return;

    if (!date) {
      showWarning("Selecione uma data");
      return;
    }

    try {
      setLoading(taskId, "reschedule");

      // Converte data/hora no fuso do Brasil para UTC
      const dueDateUTC = convertBrazilToUTC(date, time || "12:00");

      await cardTaskService.update(taskId, { due_date: dueDateUTC });
      showSuccess("Atividade reagendada!");
      onSuccess();
    } catch (error) {
      console.error("Erro ao reagendar atividade:", error);
      showError("Erro ao reagendar atividade");
    } finally {
      setLoading(taskId, undefined);
    }
  };

  /**
   * Executa a chamada para um número já selecionado.
   * Usado tanto no fluxo de número único (após confirmação) quanto no modal de seleção.
   */
  const executeCall = async (taskId: number, phone: string, cardId: number): Promise<void> => {
    try {
      setLoading(taskId, "call");

      const result = await api4comService.makeCall({ phone, card_id: cardId });

      if (result.success) {
        showSuccess("Chamada iniciada! O webphone abrirá automaticamente.");
      } else {
        showError(`Erro ao iniciar chamada: ${result.error || result.message}`);
      }
    } catch (error: any) {
      console.error("Erro ao fazer chamada:", error);
      showError(`Erro ao iniciar chamada: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(taskId, undefined);
    }
  };

  /**
   * Inicia o fluxo de chamada telefônica via API4COM.
   * Busca a pessoa vinculada ao card, verifica números disponíveis e:
   * - 1 número: confirmação direta
   * - 2+ números: abre modal de seleção (phoneSelectState)
   *
   * Nota: cardInfo deve estar carregado para que o botão "Ligar" seja exibido.
   */
  const handleMakeCall = async (task: CardTask, cardInfo: Card | null): Promise<void> => {
    if (isViewer) return;

    if (!cardInfo) {
      showWarning("Dados do card ainda não carregados");
      return;
    }

    if (!cardInfo.person_id) {
      showWarning("Não há pessoa vinculada a este card");
      return;
    }

    let person: Person;
    try {
      person = await personService.getById(cardInfo.person_id);
    } catch (error) {
      showError("Erro ao carregar dados da pessoa");
      return;
    }

    // Monta lista de números disponíveis com rótulos
    const availableNumbers = [
      person.phone && { label: "Principal", number: person.phone },
      person.phone_whatsapp && { label: "WhatsApp", number: person.phone_whatsapp },
      person.phone_commercial && { label: "Comercial", number: person.phone_commercial },
    ].filter(Boolean) as { label: string; number: string }[];

    if (availableNumbers.length === 0) {
      showWarning("A pessoa não possui nenhum número de telefone cadastrado");
      return;
    }

    // Com apenas 1 número: confirmação direta
    if (availableNumbers.length === 1) {
      const { number, label } = availableNumbers[0];
      const confirmed = await confirm({
        title: "Iniciar chamada",
        message: `Ligar para ${person.name} no número ${number} (${label})?`,
        confirmText: "Ligar",
        isDanger: false,
      });
      if (!confirmed) return;
      await executeCall(task.id, number, cardInfo.id);
      return;
    }

    // Com 2+ números: abre modal de seleção de número (guarda a pessoa para exibir os números)
    setPhoneSelectState({ taskId: task.id, cardId: cardInfo.id, person });
  };

  /**
   * Marca reunião como NoShow e dispara automação para mover card para Reagendamento.
   * ID da automação NoShow: 12 (hardcoded, igual ao FocusSection existente).
   */
  const handleNoShow = async (taskId: number, cardId: number): Promise<void> => {
    if (isViewer) return;

    const confirmed = await confirm({
      title: "Marcar como NoShow",
      message: "Marcar como NoShow? O card será movido para Reagendamento.",
      confirmText: "Confirmar",
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setLoading(taskId, "noshow");

      // Dispara automação manual de NoShow (ID 12)
      await automationService.trigger(12, cardId, {
        manual_trigger: true,
        activity_id: taskId,
      });

      // Marca a reunião como NoShow (is_completed + is_noshow = true) via endpoint dedicado
      await cardTaskService.markNoShow(taskId);

      showSuccess("Reunião marcada como NoShow e card movido para Reagendamento");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao marcar NoShow:", error);
      showError(error.response?.data?.detail || "Erro ao marcar NoShow");
    } finally {
      setLoading(taskId, undefined);
    }
  };

  /**
   * Exclui uma atividade após confirmação do usuário.
   */
  const handleDelete = async (taskId: number): Promise<void> => {
    if (isViewer) return;

    const confirmed = await confirm({
      title: "Excluir atividade",
      message: "Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setLoading(taskId, "delete");
      await cardTaskService.delete(taskId);
      showSuccess("Atividade excluída");
      onSuccess();
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
      showError("Erro ao excluir atividade");
    } finally {
      setLoading(taskId, undefined);
    }
  };

  return {
    loadingStates,
    handleToggleComplete,
    handleReschedule,
    handleMakeCall,
    handleNoShow,
    handleDelete,
    phoneSelectState,
    setPhoneSelectState,
    executeCall,
  };
}
