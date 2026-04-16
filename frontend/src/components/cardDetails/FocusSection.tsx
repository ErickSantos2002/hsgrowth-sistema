import React, { useState, useEffect } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Phone,
  Users,
  CheckSquare,
  Clock,
  Mail,
  Coffee,
  MessageCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Video,
  FileText,
  Loader2,
  X,
  Linkedin,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import cardTaskService from "../../services/cardTaskService";
import api4comService from "../../services/api4comService";
import personService, { Person } from "../../services/personService";
import { Card } from "../../types";
import { showSuccess, showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import {
  formatBrazilDate,
  formatBrazilDateTime,
  extractBrazilDateForInput,
  extractBrazilTimeForInput,
  convertBrazilToUTC,
  getActivityStatusBrazil,
} from "../../utils/timezone";

interface PendingTask {
  id: number;
  title: string;
  task_type: "call" | "meeting" | "task" | "follow_up" | "deadline" | "email" | "lunch" | "other";
  priority: "normal" | "high" | "urgent";
  due_date?: string;
  assigned_to_name?: string;
  is_overdue?: boolean;
  description?: string;
  location?: string;
  video_link?: string;
  notes?: string;
  is_completed?: boolean;
  is_valid?: boolean | null;
  // Microsoft Teams
  teams_meeting_id?: string | null;
  teams_join_url?: string | null;
  transcript_raw?: string | null;
  transcript_analysis?: string | null;
}


interface FocusSectionProps {
  tasks: PendingTask[];
  card: Card;
  onUpdate: () => void;
  /** Chamado ao clicar em "Enviar E-mail" numa task de email — abre o compositor na aba E-mail */
  onOpenEmailComposer?: (taskId: number) => void;
}

/**
 * Seção "Foco" - Atividades pendentes do card
 * Exibida na aba "Atividade", logo abaixo do formulário de criação rápida
 */
const FocusSection: React.FC<FocusSectionProps> = ({ tasks, card, onUpdate, onOpenEmailComposer }) => {
  const { confirm } = useConfirm();
  const [expandAll, setExpandAll] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<number[]>([]);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [rescheduleTaskId, setRescheduleTaskId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [callingTaskId, setCallingTaskId] = useState<number | null>(null);
  const [noShowTaskId, setNoShowTaskId] = useState<number | null>(null);
  const [phoneSelectTaskId, setPhoneSelectTaskId] = useState<number | null>(null);
  // Usa os dados que vem do backend, filtrando reuniões (têm seção própria)
  const activities = (tasks || []).filter((t) => t.task_type !== "meeting");

  // Carrega dados da pessoa quando o card é carregado
  useEffect(() => {
    const loadPersonData = async () => {
      if (card.person_id) {
        try {
          const personData = await personService.getById(card.person_id);
          setPerson(personData);
        } catch (error) {
          console.error("Erro ao carregar pessoa:", error);
        }
      } else {
        setPerson(null);
      }
    };

    loadPersonData();
  }, [card.person_id]);

  /**
   * Retorna ícone do tipo de atividade
   */
  const getActivityIcon = (type: string) => {
    const icons = {
      call: <Phone size={16} />,
      meeting: <Users size={16} />,
      task: <CheckSquare size={16} />,
      deadline: <Clock size={16} />,
      email: <Mail size={16} />,
      lunch: <Coffee size={16} />,
      whatsapp: <MessageCircle size={16} />,
      other: <MoreHorizontal size={16} />,
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

  /**
   * Retorna nome legível do tipo de atividade
   */
  const getActivityTypeName = (type: string): string => {
    const names = {
      call: "Ligação",
      meeting: "Reunião",
      task: "Tarefa",
      follow_up: "Follow Up",
      deadline: "Prazo",
      email: "E-mail",
      lunch: "Almoço",
      whatsapp: "WhatsApp",
      other: "Outro",
    };
    return names[type as keyof typeof names] || "Outro";
  };

  /**
   * Retorna classes CSS para o badge do tipo de atividade
   */
  const getActivityTypeBadgeClasses = (type: string) => {
    const classes = {
      call: "border-blue-500/40 bg-blue-500/15 text-slate-900 dark:text-blue-300",
      meeting: "border-purple-500/40 bg-purple-500/15 text-slate-900 dark:text-purple-300",
      task: "border-green-500/40 bg-green-500/15 text-slate-900 dark:text-green-300",
      follow_up: "border-yellow-500/40 bg-yellow-500/15 text-slate-900 dark:text-yellow-300",
      deadline: "border-yellow-500/40 bg-yellow-500/15 text-slate-900 dark:text-yellow-300",
      email: "border-blue-500/40 bg-blue-500/15 text-slate-900 dark:text-blue-300",
      lunch: "border-purple-500/40 bg-purple-500/15 text-slate-900 dark:text-purple-300",
      whatsapp: "border-emerald-500/40 bg-emerald-500/15 text-slate-900 dark:text-emerald-300",
      other: "border-gray-300 dark:border-slate-600 bg-slate-700/40 text-slate-900 dark:text-slate-300",
    };

    return classes[type as keyof typeof classes] || classes.other;
  };

  /**
   * Retorna classes CSS para o fundo do card por tipo de atividade
   */
  const getActivityTypeCardClasses = (type: string) => {
    const classes = {
      call: "bg-blue-500/10 hover:bg-blue-500/20",
      meeting: "bg-purple-500/10 hover:bg-purple-500/20",
      task: "bg-green-500/10 hover:bg-green-500/20",
      follow_up: "bg-yellow-500/10 hover:bg-yellow-500/20",
      deadline: "bg-yellow-500/10 hover:bg-yellow-500/20",
      email: "bg-blue-500/10 hover:bg-blue-500/20",
      lunch: "bg-purple-500/10 hover:bg-purple-500/20",
      whatsapp: "bg-emerald-500/10 hover:bg-emerald-500/20",
      other: "bg-gray-100/50 dark:bg-slate-800/50 hover:bg-slate-700/30",
    };

    return classes[type as keyof typeof classes] || classes.other;
  };

  /**
   * Config dos tipos de atividade para o seletor de edição
   */
  const editActivityTypes = [
    { type: "call",      label: "Ligação",   icon: <Phone size={14} />,         color: "blue" },
    { type: "whatsapp",  label: "WhatsApp",  icon: <MessageCircle size={14} />, color: "emerald" },
    { type: "email",     label: "E-mail",    icon: <Mail size={14} />,          color: "orange" },
    { type: "task",      label: "Tarefa",    icon: <CheckSquare size={14} />,   color: "green" },
    { type: "follow_up", label: "Follow Up", icon: <Clock size={14} />,         color: "yellow" },
    { type: "deadline",  label: "Prazo",     icon: <Calendar size={14} />,      color: "red" },
    { type: "lunch",     label: "Almoço",    icon: <Coffee size={14} />,        color: "purple" },
    { type: "linkedin",  label: "LinkedIn",  icon: <Linkedin size={14} />,      color: "sky" },
    { type: "other",     label: "Outro",     icon: <MoreHorizontal size={14} />, color: "slate" },
  ] as const;

  const getEditTypeColorClasses = (type: string, isSelected: boolean) => {
    const unselected = "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700";
    const selected: Record<string, string> = {
      call:      "bg-blue-500/30 text-slate-900 dark:text-blue-400 border-blue-500",
      whatsapp:  "bg-emerald-500/30 text-slate-900 dark:text-emerald-400 border-emerald-500",
      email:     "bg-orange-500/30 text-slate-900 dark:text-orange-400 border-orange-500",
      task:      "bg-green-500/30 text-slate-900 dark:text-green-400 border-green-500",
      follow_up: "bg-yellow-500/30 text-slate-900 dark:text-yellow-400 border-yellow-500",
      deadline:  "bg-red-500/30 text-slate-900 dark:text-red-400 border-red-500",
      lunch:     "bg-purple-500/30 text-slate-900 dark:text-purple-400 border-purple-500",
      linkedin:  "bg-sky-500/30 text-slate-900 dark:text-sky-400 border-sky-500",
      other:     "bg-slate-500/30 text-slate-900 dark:text-slate-400 border-slate-400 dark:border-slate-500",
    };
    return isSelected ? (selected[type] ?? unselected) : unselected;
  };

  /**
   * Retorna classes CSS para o badge de prioridade
   */
  const getPriorityBadgeClasses = (priority: string) => {
    const classes = {
      normal: "border-blue-500/40 bg-blue-500/15 text-slate-900 dark:text-blue-300",
      high: "border-yellow-500/40 bg-yellow-500/15 text-slate-900 dark:text-yellow-300",
      urgent: "border-red-500/40 bg-red-500/15 text-slate-900 dark:text-red-300",
    };

    return classes[priority as keyof typeof classes] || classes.normal;
  };

  /**
   * Retorna label da prioridade
   */
  const getPriorityLabel = (priority: string) => {
    const labels = {
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority as keyof typeof labels] || "Normal";
  };

  /**
   * Marca atividade como concluída
   */
  const handleComplete = async (activityId: number, isValid: boolean) => {
    try {
      setLoadingTaskId(activityId);
      await cardTaskService.toggleComplete(activityId, true, isValid);
      showSuccess(isValid ? "Atividade concluída como válida!" : "Atividade marcada como não válida.");
      onUpdate();
    } catch (error) {
      console.error("Erro ao completar atividade:", error);
      showError("Erro ao completar atividade");
    } finally {
      setLoadingTaskId(null);
    }
  };

  /**
   * Deleta uma atividade
   */
  const handleDeleteTask = async (activityId: number) => {
    const confirmed = await confirm({
      title: "Excluir atividade",
      message: "Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setLoadingTaskId(activityId);
      await cardTaskService.delete(activityId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao deletar atividade:", error);
      showError("Erro ao deletar atividade");
    } finally {
      setLoadingTaskId(null);
    }
  };

  /**
   * Inicia edição de uma tarefa
   */
  const handleStartEdit = (task: PendingTask) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      task_type: task.task_type,
      description: task.description || "",
      location: task.location || "",
      notes: task.notes || "",
      video_link: task.video_link || "",
      priority: task.priority,
    });
  };

  /**
   * Salva edição da tarefa
   */
  const handleSaveEdit = async () => {
    if (!editingTaskId || !editFormData.title.trim()) {
      showWarning("O título é obrigatório");
      return;
    }

    try {
      setLoadingTaskId(editingTaskId);
      await cardTaskService.update(editingTaskId, {
        title: editFormData.title,
        task_type: editFormData.task_type,
        description: editFormData.description || null,
        location: editFormData.location || null,
        notes: editFormData.notes || null,
        video_link: editFormData.video_link || null,
        priority: editFormData.priority,
      });
      setEditingTaskId(null);
      setEditFormData({});
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      showError("Erro ao atualizar tarefa");
    } finally {
      setLoadingTaskId(null);
    }
  };

  /**
   * Cancela edição
   */
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  /**
   * Abre modal de reagendamento
   */
  const handleOpenReschedule = (task: PendingTask) => {
    setRescheduleTaskId(task.id);
    if (task.due_date) {
      // Extrai data e hora no horário do Brasil
      setRescheduleDate(extractBrazilDateForInput(task.due_date));
      setRescheduleTime(extractBrazilTimeForInput(task.due_date));
    } else {
      setRescheduleDate("");
      setRescheduleTime("");
    }
  };

  /**
   * Salva reagendamento
   */
  const handleSaveReschedule = async () => {
    if (!rescheduleTaskId || !rescheduleDate) {
      showWarning("Selecione uma data");
      return;
    }

    try {
      setLoadingTaskId(rescheduleTaskId);

      // Converte a data/hora do Brasil para UTC antes de enviar ao backend
      const dueDateTimeUTC = convertBrazilToUTC(rescheduleDate, rescheduleTime || "12:00");

      await cardTaskService.update(rescheduleTaskId, {
        due_date: dueDateTimeUTC,
      });

      setRescheduleTaskId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao reagendar tarefa:", error);
      showError("Erro ao reagendar tarefa");
    } finally {
      setLoadingTaskId(null);
    }
  };

  /**
   * Cancela reagendamento
   */
  const handleCancelReschedule = () => {
    setRescheduleTaskId(null);
    setRescheduleDate("");
    setRescheduleTime("");
  };

  /**
   * Executa a chamada para um número já selecionado.
   * Usado tanto no fluxo de número único (após confirmação) quanto no modal de seleção.
   */
  const executeCall = async (activityId: number, phoneNumber: string) => {
    try {
      setCallingTaskId(activityId);

      const result = await api4comService.makeCall({
        phone: phoneNumber,
        card_id: card.id,
      });

      if (result.success) {
        showSuccess("Chamada iniciada! O webphone abrirá automaticamente.");
      } else {
        showError(`Erro ao iniciar chamada: ${result.error || result.message}`);
      }
    } catch (error: any) {
      console.error("Erro ao fazer chamada:", error);
      showError(`Erro ao iniciar chamada: ${error.response?.data?.detail || error.message}`);
    } finally {
      setCallingTaskId(null);
    }
  };

  /**
   * Inicia o fluxo de chamada telefônica via API4COM.
   * - 1 número disponível: abre confirmação direta.
   * - 2+ números disponíveis: abre modal de seleção de número.
   */
  const handleMakeCall = async (activityId: number) => {
    if (!person) {
      showWarning("Não há pessoa vinculada a este card");
      return;
    }

    // Monta a lista de números disponíveis com seus rótulos
    const availableNumbers = [
      person.phone && { label: "Principal", number: person.phone },
      person.phone_whatsapp && { label: "WhatsApp", number: person.phone_whatsapp },
      person.phone_commercial && { label: "Comercial", number: person.phone_commercial },
    ].filter(Boolean) as { label: string; number: string }[];

    if (availableNumbers.length === 0) {
      showWarning("A pessoa não possui nenhum número de telefone cadastrado");
      return;
    }

    // Com apenas 1 número, mantém o fluxo de confirmação direta
    if (availableNumbers.length === 1) {
      const { number, label } = availableNumbers[0];
      const confirmed = await confirm({
        title: "Iniciar chamada",
        message: `Ligar para ${person.name} no número ${number} (${label})?`,
        confirmText: "Ligar",
        isDanger: false,
      });
      if (!confirmed) return;
      await executeCall(activityId, number);
      return;
    }

    // Com 2 ou 3 números, abre o modal de seleção
    setPhoneSelectTaskId(activityId);
  };

  /**
   * Marca reunião como NoShow e move card para Reagendamento
   */
  const handleNoShow = async (activityId: number) => {
    const confirmed = await confirm({
      title: "Marcar como NoShow",
      message: "Marcar como NoShow? O card será movido para Reagendamento.",
      confirmText: "Confirmar",
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setNoShowTaskId(activityId);
      await cardTaskService.markNoShow(activityId);
      showSuccess("Reunião marcada como NoShow e card movido para Reagendamento");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Erro ao marcar NoShow:", error);
      showError(error.response?.data?.detail || "Erro ao marcar NoShow");
    } finally {
      setNoShowTaskId(null);
    }
  };

  /**
   * Toggle expansão de uma atividade
   */
  const toggleActivity = (activityId: number) => {
    if (expandedActivities.includes(activityId)) {
      setExpandedActivities(expandedActivities.filter((id) => id !== activityId));
    } else {
      setExpandedActivities([...expandedActivities, activityId]);
    }
  };


  /**
   * Expande/recolhe todas as atividades
   */
  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedActivities([]);
    } else {
      setExpandedActivities(activities.map((a) => a.id));
    }
    setExpandAll(!expandAll);
  };

  /**
   * Retorna classes CSS para prioridade
   */
  const getPriorityBorderClass = (priority: string) => {
    if (priority === "high") return "border-l-4 border-l-yellow-500";
    if (priority === "urgent") return "border-l-4 border-l-red-500";
    return "";
  };

  // Filtra apenas atividades não concluídas e ordena por data
  const pendingActivities = activities
    .filter((a) => !a.is_completed)
    .sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      return dateA - dateB;
    });

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Foco</h3>
        <button
          onClick={toggleExpandAll}
          className="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          {expandAll ? "Recolher todos" : "Expandir todos"}
        </button>
      </div>

      {pendingActivities.length === 0 ? (
        <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-6 text-center">
          <CheckSquare size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-400">Nenhuma atividade pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingActivities.map((activity) => {
            const isExpanded = expandedActivities.includes(activity.id);
            // Calcula o status usando o horário do Brasil
            const status = activity.due_date ? getActivityStatusBrazil(activity.due_date) : "future";

            return (
              <div
                key={activity.id}
                className={`overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 transition-colors ${getActivityTypeCardClasses(
                  activity.task_type
                )}`}
              >
                {/* Header da atividade */}
                <div className="flex items-start gap-3 p-3">
                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start gap-2">
                      <span className="mt-0.5 text-slate-400 dark:text-slate-400">
                        {getActivityIcon(activity.task_type)}
                      </span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{activity.title}</p>
                          <span
                            className={`inline-flex min-w-[64px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium ${getPriorityBadgeClasses(
                              activity.priority
                            )}`}
                          >
                            {getPriorityLabel(activity.priority)}
                          </span>
                          <span
                            className={`hidden min-w-[80px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium ${getActivityTypeBadgeClasses(
                              activity.task_type
                            )}`}
                          >
                            {getActivityTypeName(activity.task_type)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-400">
                          <StatusBadge status={status} />
                          {activity.due_date && <span>{formatBrazilDateTime(activity.due_date)}</span>}
                          {activity.assigned_to_name && (
                            <>
                              <span>•</span>
                              <span>{activity.assigned_to_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex min-w-[80px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium ${getActivityTypeBadgeClasses(
                          activity.task_type
                        )}`}
                      >
                        {getActivityTypeName(activity.task_type)}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className="rounded p-1 text-slate-400 dark:text-slate-400 transition-colors hover:bg-slate-600"
                      title={isExpanded ? "Recolher" : "Expandir"}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="space-y-3 border-t border-gray-200/50 dark:border-slate-700/50 px-3 pb-3 pt-0">
                    {/* Modo de edição */}
                    {editingTaskId === activity.id ? (
                      <div className="space-y-3 pt-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Título *
                          </label>
                          <input
                            type="text"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Digite o título"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Tipo de Atividade
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {editActivityTypes.map((at) => (
                              <button
                                key={at.type}
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, task_type: at.type })}
                                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${getEditTypeColorClasses(at.type, editFormData.task_type === at.type)}`}
                              >
                                {at.icon}
                                <span>{at.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Descrição
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            rows={3}
                            className="w-full resize-none rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Adicione uma descrição"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Anotações
                          </label>
                          <textarea
                            value={editFormData.notes}
                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                            rows={3}
                            className="w-full resize-none rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Adicione anotações da reunião"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Link da gravação
                          </label>
                          <input
                            type="url"
                            value={editFormData.video_link}
                            onChange={(e) => setEditFormData({ ...editFormData, video_link: e.target.value })}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://meet.google.com/... ou link da gravação"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
                            Prioridade
                          </label>
                          <select
                            value={editFormData.priority}
                            onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={loadingTaskId === activity.id}
                            className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                          >
                            {loadingTaskId === activity.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Salvar alterações
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={loadingTaskId === activity.id}
                            className="rounded bg-gray-200 dark:bg-slate-700 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Descrição */}
                        {activity.description && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText size={16} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                            <p className="text-slate-600 dark:text-slate-300">{activity.description}</p>
                          </div>
                        )}

                        {/* Localização */}
                        {activity.location && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                            <p className="text-slate-600 dark:text-slate-300">{activity.location}</p>
                          </div>
                        )}

                        {/* Link de vídeo */}
                        {activity.video_link && (
                          <div className="flex items-start gap-2 text-sm">
                            <Video size={16} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                            <a
                              href={activity.video_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 underline hover:text-blue-300"
                            >
                              Entrar na videochamada
                            </a>
                          </div>
                        )}

                        {/* Notas */}
                        {activity.notes && (
                          <div className="rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-2 text-sm text-slate-600 dark:text-slate-300">
                            <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">Notas:</p>
                            {activity.notes}
                          </div>
                        )}


                        {/* Botões de ação */}
                        <div className="flex gap-2 pt-2">
                          {/* Botão Ligar - só aparece para atividades de ligação */}
                          {activity.task_type === "call" && (
                            <button
                              onClick={() => handleMakeCall(activity.id)}
                              disabled={callingTaskId === activity.id || (!person?.phone && !person?.phone_whatsapp && !person?.phone_commercial)}
                              className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                              title={!person?.phone && !person?.phone_whatsapp && !person?.phone_commercial ? "Pessoa sem nenhum número cadastrado" : "Ligar agora"}
                            >
                              {callingTaskId === activity.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Phone size={14} />
                              )}
                              {/* Tracinho diagonal quando sem número */}
                              {!person?.phone && !person?.phone_whatsapp && !person?.phone_commercial && callingTaskId !== activity.id && (
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                                    <line x1="4" y1="4" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          )}

                          {/* Botão NoShow - só aparece para reuniões */}
                          {activity.task_type === "meeting" && (
                            <button
                              onClick={() => handleNoShow(activity.id)}
                              disabled={noShowTaskId === activity.id || loadingTaskId === activity.id}
                              className="flex flex-1 items-center justify-center gap-1 rounded border border-orange-500/50 bg-orange-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-orange-400 transition-colors hover:bg-orange-500/30 disabled:opacity-50"
                              title="Cliente não compareceu - move para Reagendamento"
                            >
                              {noShowTaskId === activity.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Users size={14} />
                              )}
                              NoShow
                            </button>
                          )}

                          {activity.task_type === "email" ? (
                            <button
                              onClick={() => onOpenEmailComposer?.(activity.id)}
                              disabled={loadingTaskId === activity.id}
                              className="flex flex-1 items-center justify-center gap-1 rounded border border-orange-500/50 bg-orange-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-orange-400 transition-colors hover:bg-orange-500/30 disabled:opacity-50"
                              title="Abrir compositor de e-mail"
                            >
                              <Mail size={14} />
                              Enviar E-mail
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleComplete(activity.id, true)}
                                disabled={loadingTaskId === activity.id}
                                className="flex flex-1 items-center justify-center gap-1 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                                title="Atividade realizada com sucesso"
                              >
                                {loadingTaskId === activity.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Válido
                              </button>
                              <button
                                onClick={() => handleComplete(activity.id, false)}
                                disabled={loadingTaskId === activity.id}
                                className="flex flex-1 items-center justify-center gap-1 rounded border border-orange-500/50 bg-orange-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-orange-400 transition-colors hover:bg-orange-500/30 disabled:opacity-50"
                                title="Tentativa sem resultado (ex: ligação não atendida)"
                              >
                                {loadingTaskId === activity.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <X size={14} />
                                )}
                                Não Válido
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleStartEdit(activity)}
                            disabled={loadingTaskId === activity.id}
                            className="rounded border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenReschedule(activity)}
                            disabled={loadingTaskId === activity.id}
                            className="rounded border border-yellow-500/50 bg-yellow-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-500/30 disabled:opacity-50"
                            title="Reagendar"
                          >
                            <Calendar size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(activity.id)}
                            disabled={loadingTaskId === activity.id}
                            className="rounded border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                            title="Excluir"
                          >
                            {loadingTaskId === activity.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de seleção de número para ligação */}
      {phoneSelectTaskId && person && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-slate-700 p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Phone size={20} className="text-blue-400" />
                Selecionar número
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Para qual número deseja ligar para{" "}
                <span className="font-medium text-slate-900 dark:text-white">{person.name}</span>?
              </p>
            </div>

            <div className="space-y-2 p-4">
              {[
                person.phone && { label: "Principal", number: person.phone },
                person.phone_whatsapp && { label: "WhatsApp", number: person.phone_whatsapp },
                person.phone_commercial && { label: "Comercial", number: person.phone_commercial },
              ]
                .filter(Boolean)
                .map((item) => {
                  const { label, number } = item as { label: string; number: string };
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setPhoneSelectTaskId(null);
                        executeCall(phoneSelectTaskId, number);
                      }}
                      disabled={callingTaskId === phoneSelectTaskId}
                      className="flex w-full items-center gap-3 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-left transition-colors hover:border-blue-400/60 hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      <Phone size={16} className="flex-shrink-0 text-blue-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                          {label}
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{number}</p>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 p-4">
              <button
                onClick={() => setPhoneSelectTaskId(null)}
                className="w-full rounded bg-gray-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reagendamento */}
      {rescheduleTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-slate-700 p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Calendar size={20} className="text-yellow-400" />
                Reagendar Atividade
              </h3>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Nova Data *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Horário (opcional)
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-400">
                Se não definir um horário, será usado 12:00 como padrão.
              </p>
            </div>

            <div className="flex gap-2 border-t border-gray-200 dark:border-slate-700 p-4">
              <button
                onClick={handleSaveReschedule}
                disabled={loadingTaskId === rescheduleTaskId}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-yellow-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-yellow-600 disabled:opacity-50"
              >
                {loadingTaskId === rescheduleTaskId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Reagendar
              </button>
              <button
                onClick={handleCancelReschedule}
                disabled={loadingTaskId === rescheduleTaskId}
                className="rounded bg-gray-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusSection;
