import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Phone, Users, CheckSquare, Clock, Mail, Coffee, MoreHorizontal } from "lucide-react";
import api from "../../services/api";
import StatusBadge from "../cardDetails/StatusBadge";
import { formatBrazilDate, getActivityStatusBrazil } from "../../utils/timezone";

interface CardTask {
  id: number;
  title: string;
  task_type: string;
  due_date: string | null;
  is_completed: boolean;
  assigned_to_name: string | null;
  priority: string;
}

interface CardActivitiesModalProps {
  cardId: number;
  cardTitle: string;
  onClose: () => void;
}

/**
 * Modal pequena para exibir atividades de um card
 * Segue o mesmo padrão visual do FocusSection
 */
const CardActivitiesModal: React.FC<CardActivitiesModalProps> = ({
  cardId,
  cardTitle,
  onClose,
}) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [cardId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/card-tasks`, {
        params: {
          card_id: cardId,
          is_completed: false,
          page_size: 50,
        },
      });
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navega para a página de detalhes do card ao clicar em uma atividade
   */
  const handleActivityClick = () => {
    onClose();
    navigate(`/cards/${cardId}`);
  };

  /**
   * Retorna ícone do tipo de atividade (mesmo padrão do FocusSection)
   */
  const getActivityIcon = (type: string) => {
    const icons = {
      call: <Phone size={16} />,
      meeting: <Users size={16} />,
      task: <CheckSquare size={16} />,
      follow_up: <Clock size={16} />,
      deadline: <Clock size={16} />,
      email: <Mail size={16} />,
      lunch: <Coffee size={16} />,
      other: <MoreHorizontal size={16} />,
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

  /**
   * Retorna nome legível do tipo de atividade (mesmo padrão do FocusSection)
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
      other: "Outro",
    };
    return names[type as keyof typeof names] || "Outro";
  };

  /**
   * Retorna classes CSS para o badge do tipo de atividade (mesmo padrão do FocusSection)
   */
  const getActivityTypeBadgeClasses = (type: string) => {
    const classes = {
      call: "border-blue-500/40 bg-blue-500/15 text-blue-300",
      meeting: "border-purple-500/40 bg-purple-500/15 text-purple-300",
      task: "border-green-500/40 bg-green-500/15 text-green-300",
      follow_up: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
      deadline: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
      email: "border-blue-500/40 bg-blue-500/15 text-blue-300",
      lunch: "border-purple-500/40 bg-purple-500/15 text-purple-300",
      other: "border-slate-600 bg-slate-700/40 text-slate-300",
    };

    return classes[type as keyof typeof classes] || classes.other;
  };

  /**
   * Retorna classes CSS para o fundo do card por tipo (mesmo padrão do FocusSection)
   */
  const getActivityTypeCardClasses = (type: string) => {
    const classes = {
      call: "bg-blue-500/10",
      meeting: "bg-purple-500/10",
      task: "bg-green-500/10",
      follow_up: "bg-yellow-500/10",
      deadline: "bg-yellow-500/10",
      email: "bg-blue-500/10",
      lunch: "bg-purple-500/10",
      other: "bg-slate-800/50",
    };

    return classes[type as keyof typeof classes] || classes.other;
  };

  /**
   * Retorna classes CSS para o badge de prioridade (mesmo padrão do FocusSection)
   */
  const getPriorityBadgeClasses = (priority: string) => {
    const classes = {
      normal: "border-blue-500/40 bg-blue-500/15 text-blue-300",
      high: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
      urgent: "border-red-500/40 bg-red-500/15 text-red-300",
    };

    return classes[priority as keyof typeof classes] || classes.normal;
  };

  /**
   * Retorna label da prioridade (mesmo padrão do FocusSection)
   */
  const getPriorityLabel = (priority: string) => {
    const labels = {
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority as keyof typeof labels] || "Normal";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex h-full w-80 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <div>
            <h3 className="font-semibold text-white">Atividades Pendentes</h3>
            <p className="text-sm text-slate-400">{cardTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <CheckSquare size={32} className="mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-400">Nenhuma atividade pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const status = task.due_date ? getActivityStatusBrazil(task.due_date) : "future";

                return (
                  <div
                    key={task.id}
                    onClick={handleActivityClick}
                    className={`cursor-pointer overflow-hidden rounded-lg border border-slate-700 transition-colors hover:border-slate-600 hover:brightness-110 ${getActivityTypeCardClasses(
                      task.task_type
                    )}`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      {/* Ícone */}
                      <span className="mt-0.5 text-slate-400">
                        {getActivityIcon(task.task_type)}
                      </span>

                      {/* Conteúdo */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium text-white">{task.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Badges */}
                          <span
                            className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium ${getActivityTypeBadgeClasses(
                              task.task_type
                            )}`}
                          >
                            {getActivityTypeName(task.task_type)}
                          </span>
                          {task.priority !== "normal" && (
                            <span
                              className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium ${getPriorityBadgeClasses(
                                task.priority
                              )}`}
                            >
                              {getPriorityLabel(task.priority)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <StatusBadge status={status} />
                          {task.due_date && <span>{formatBrazilDate(task.due_date)}</span>}
                          {task.assigned_to_name && (
                            <>
                              <span>•</span>
                              <span>{task.assigned_to_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardActivitiesModal;
