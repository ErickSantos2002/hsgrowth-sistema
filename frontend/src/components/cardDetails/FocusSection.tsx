import React, { useState } from "react";
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
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Video,
  FileText,
  Loader2,
} from "lucide-react";
import StatusBadge, { type ActivityStatus } from "./StatusBadge";
import cardTaskService from "../../services/cardTaskService";

interface PendingTask {
  id: number;
  title: string;
  task_type: "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";
  priority: "normal" | "high" | "urgent";
  due_date?: string;
  assigned_to_name?: string;
  is_overdue?: boolean;
  description?: string;
  location?: string;
  video_link?: string;
  notes?: string;
  is_completed?: boolean;
}

interface FocusSectionProps {
  tasks: PendingTask[];
  onUpdate: () => void;
}

/**
 * Seção "Foco" - Atividades pendentes do card
 * Exibida na aba "Atividade", logo abaixo do formulário de criação rápida
 */
const FocusSection: React.FC<FocusSectionProps> = ({ tasks, onUpdate }) => {
  const [expandAll, setExpandAll] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<number[]>([]);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [rescheduleTaskId, setRescheduleTaskId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Usa os dados que vem do backend
  const activities = tasks || [];

  /**
   * Calcula o status da atividade (VENCIDO/HOJE/AMANHÃ)
   */
  const getActivityStatus = (dateStr: string): ActivityStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityDate = new Date(dateStr);
    activityDate.setHours(0, 0, 0, 0);

    const diffTime = activityDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    return "future";
  };

  /**
   * Formata data para exibição
   */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

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
      other: <MoreHorizontal size={16} />,
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

  /**
   * Marca atividade como concluída
   */
  const handleToggleComplete = async (activityId: number) => {
    try {
      setLoadingTaskId(activityId);
      await cardTaskService.toggleComplete(activityId, true);
      onUpdate();
    } catch (error) {
      console.error("Erro ao completar atividade:", error);
      alert("Erro ao completar atividade");
    } finally {
      setLoadingTaskId(null);
    }
  };

  /**
   * Deleta uma atividade
   */
  const handleDeleteTask = async (activityId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;

    try {
      setLoadingTaskId(activityId);
      await cardTaskService.delete(activityId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao deletar atividade:", error);
      alert("Erro ao deletar atividade");
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
      description: task.description || "",
      location: task.location || "",
      priority: task.priority,
    });
  };

  /**
   * Salva edição da tarefa
   */
  const handleSaveEdit = async () => {
    if (!editingTaskId || !editFormData.title.trim()) {
      alert("O título é obrigatório");
      return;
    }

    try {
      setLoadingTaskId(editingTaskId);
      await cardTaskService.update(editingTaskId, {
        title: editFormData.title,
        description: editFormData.description || null,
        location: editFormData.location || null,
        priority: editFormData.priority,
      });
      setEditingTaskId(null);
      setEditFormData({});
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      alert("Erro ao atualizar tarefa");
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
      const date = new Date(task.due_date);
      setRescheduleDate(date.toISOString().split("T")[0]);
      setRescheduleTime(date.toTimeString().slice(0, 5));
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
      alert("Selecione uma data");
      return;
    }

    try {
      setLoadingTaskId(rescheduleTaskId);

      const dueDateTime = rescheduleTime
        ? `${rescheduleDate}T${rescheduleTime}:00`
        : `${rescheduleDate}T12:00:00`;

      await cardTaskService.update(rescheduleTaskId, {
        due_date: dueDateTime,
      });

      setRescheduleTaskId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao reagendar tarefa:", error);
      alert("Erro ao reagendar tarefa");
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Foco</h3>
        <button
          onClick={toggleExpandAll}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expandAll ? "Recolher todos" : "Expandir todos"}
        </button>
      </div>

      {pendingActivities.length === 0 ? (
        <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-lg text-center">
          <CheckSquare size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm text-slate-400">Nenhuma atividade pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingActivities.map((activity) => {
            const isExpanded = expandedActivities.includes(activity.id);
            const status = activity.is_overdue ? "overdue" :
                          activity.due_date && new Date(activity.due_date).toDateString() === new Date().toDateString() ? "today" :
                          "future";

            return (
              <div
                key={activity.id}
                className={`bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:bg-slate-700/30 transition-colors ${getPriorityBorderClass(
                  activity.priority
                )}`}
              >
                {/* Header da atividade */}
                <div className="p-3 flex items-start gap-3">
                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-slate-400 mt-0.5">
                        {getActivityIcon(activity.task_type)}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white">{activity.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                          <StatusBadge status={status} />
                          {activity.due_date && <span>{formatDate(activity.due_date)}</span>}
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className="p-1 hover:bg-slate-600 rounded transition-colors text-slate-400"
                      title={isExpanded ? "Recolher" : "Expandir"}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-slate-700/50 space-y-3">
                    {/* Modo de edição */}
                    {editingTaskId === activity.id ? (
                      <div className="space-y-3 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Título *
                          </label>
                          <input
                            type="text"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Digite o título"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Descrição
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Adicione uma descrição"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Local
                          </label>
                          <input
                            type="text"
                            value={editFormData.location}
                            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Endereço ou local"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Prioridade
                          </label>
                          <select
                            value={editFormData.priority}
                            onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
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
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-sm transition-colors disabled:opacity-50"
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
                            <FileText size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                            <p className="text-slate-300">{activity.description}</p>
                          </div>
                        )}

                        {/* Localização */}
                        {activity.location && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                            <p className="text-slate-300">{activity.location}</p>
                          </div>
                        )}

                        {/* Link de vídeo */}
                        {activity.video_link && (
                          <div className="flex items-start gap-2 text-sm">
                            <Video size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                            <a
                              href={activity.video_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Entrar na videochamada
                            </a>
                          </div>
                        )}

                        {/* Notas */}
                        {activity.notes && (
                          <div className="p-2 bg-slate-900/50 border border-slate-700 rounded text-sm text-slate-300">
                            <p className="text-xs text-slate-500 mb-1">Notas:</p>
                            {activity.notes}
                          </div>
                        )}

                        {/* Botões de ação */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleToggleComplete(activity.id)}
                            disabled={loadingTaskId === activity.id}
                            className="flex-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded font-medium text-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {loadingTaskId === activity.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Marcar como concluído
                          </button>
                          <button
                            onClick={() => handleStartEdit(activity)}
                            disabled={loadingTaskId === activity.id}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded font-medium text-sm transition-colors disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenReschedule(activity)}
                            disabled={loadingTaskId === activity.id}
                            className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded font-medium text-sm transition-colors disabled:opacity-50"
                            title="Reagendar"
                          >
                            <Calendar size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(activity.id)}
                            disabled={loadingTaskId === activity.id}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded font-medium text-sm transition-colors disabled:opacity-50"
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

      {/* Modal de reagendamento */}
      {rescheduleTaskId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar size={20} className="text-yellow-400" />
                Reagendar Atividade
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nova Data *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Horário (opcional)
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <p className="text-xs text-slate-400">
                Se não definir um horário, será usado 12:00 como padrão.
              </p>
            </div>

            <div className="p-4 border-t border-slate-700 flex gap-2">
              <button
                onClick={handleSaveReschedule}
                disabled={loadingTaskId === rescheduleTaskId}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-sm transition-colors disabled:opacity-50"
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
