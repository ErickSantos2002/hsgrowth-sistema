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
} from "lucide-react";
import StatusBadge, { type ActivityStatus } from "./StatusBadge";

interface PendingTask {
  id: number;
  title: string;
  task_type: "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";
  priority: "normal" | "high" | "urgent";
  due_date?: string;
  assigned_to_name?: string;
  is_overdue?: boolean;
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
  const handleToggleComplete = (activityId: number) => {
    setActivities(
      activities.map((a) =>
        a.id === activityId ? { ...a, is_completed: !a.is_completed } : a
      )
    );

    // TODO: Integrar com backend
    // await activityService.update(activityId, { is_completed: true });
    // onUpdate();
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
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
                        className="flex-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded font-medium text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Marcar como concluído
                      </button>
                      <button
                        onClick={() => alert("Editar atividade - será implementado")}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded font-medium text-sm transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => alert("Reagendar - será implementado")}
                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded font-medium text-sm transition-colors"
                        title="Reagendar"
                      >
                        <Calendar size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir esta atividade?")) {
                            setActivities(activities.filter((a) => a.id !== activity.id));
                          }
                        }}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded font-medium text-sm transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FocusSection;
