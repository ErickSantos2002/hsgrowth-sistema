import React, { useRef, useState } from "react";
import {
  Calendar,
  Phone,
  Users,
  CheckSquare,
  Clock,
  Mail,
  Coffee,
  MessageCircle,
  MoreHorizontal,
  MapPin,
  Video,
  FileText,
  X,
  Save,
  Plus,
} from "lucide-react";
import cardTaskService from "../../services/cardTaskService";
import { convertBrazilToUTC } from "../../utils/timezone";
import { showError, showWarning } from "../../utils/toast";

interface QuickActivityFormProps {
  cardId: number;
  onSave: () => void;
  onCancel: () => void;
  /** Data pré-selecionada no formato YYYY-MM-DD (opcional).
   * Quando fornecida, o formulário inicia expandido com a data preenchida.
   * Útil ao abrir o form ao clicar em um dia no calendário. */
  defaultDate?: string;
}

/**
 * Tipos de atividade disponíveis
 */
type ActivityType = "call" | "task" | "follow_up" | "whatsapp" | "other";

interface ActivityTypeConfig {
  type: ActivityType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * Formulário de criação rápida de atividade
 * Usado na aba "Atividade" da coluna direita
 */
const QuickActivityForm: React.FC<QuickActivityFormProps> = ({ cardId, onSave, onCancel, defaultDate }) => {
  // Inicia expandido quando uma data padrão é fornecida (ex: clique em dia no calendário)
  const [isExpanded, setIsExpanded] = useState(defaultDate !== undefined);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getNowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    type: "call" as ActivityType,
    date: defaultDate ?? getTodayDate(),
    time: getNowTime(),
    duration: "30", // minutos
    priority: "normal" as "normal" | "high" | "urgent",
    description: "",
    notes: "",
    location: "",
    video_link: "",
    participants: [] as number[],
  });

  /**
   * Configuração dos tipos de atividade
   */
  const activityTypes: ActivityTypeConfig[] = [
    { type: "call", label: "Ligação", icon: <Phone size={16} />, color: "blue" },
    { type: "task", label: "Tarefa", icon: <CheckSquare size={16} />, color: "green" },
    { type: "follow_up", label: "Follow Up", icon: <Clock size={16} />, color: "yellow" },
    { type: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={16} />, color: "emerald" },
    { type: "other", label: "Outro", icon: <MoreHorizontal size={16} />, color: "slate" },
  ];

  /**
   * Retorna classes CSS para o tipo de atividade selecionado
   */
  const getTypeColorClasses = (type: ActivityType, isSelected: boolean) => {
    const unselected = "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700";
    const configs = {
      call: isSelected
        ? "bg-blue-500/30 text-slate-900 dark:text-blue-400 border-blue-500"
        : unselected,
      task: isSelected
        ? "bg-green-500/30 text-slate-900 dark:text-green-400 border-green-500"
        : unselected,
      follow_up: isSelected
        ? "bg-yellow-500/30 text-slate-900 dark:text-yellow-400 border-yellow-500"
        : unselected,
      whatsapp: isSelected
        ? "bg-emerald-500/30 text-slate-900 dark:text-emerald-400 border-emerald-500"
        : unselected,
      other: isSelected
        ? "bg-slate-500/30 text-slate-900 dark:text-slate-400 border-gray-400 dark:border-slate-500"
        : unselected,
    };
    return configs[type];
  };

  /**
   * Retorna classes CSS para prioridade
   */
  const getPriorityClasses = (priority: string, isSelected: boolean) => {
    const configs = {
      normal: isSelected
        ? "bg-blue-500/30 text-slate-900 dark:text-blue-300 border-blue-500"
        : "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700",
      high: isSelected
        ? "bg-yellow-500/30 text-slate-900 dark:text-yellow-400 border-yellow-500"
        : "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700",
      urgent: isSelected
        ? "bg-red-500/30 text-slate-900 dark:text-red-400 border-red-500"
        : "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700",
    };
    return configs[priority as keyof typeof configs];
  };

  /**
   * Salva a atividade
   */
  const handleSave = async () => {
    if (!formData.title.trim()) {
      showWarning("Por favor, preencha o título da atividade");
      return;
    }

    if (!formData.description.trim()) {
      showWarning("Por favor, preencha a descrição da atividade");
      return;
    }

    if (!formData.date) {
      showWarning("Por favor, selecione uma data");
      return;
    }

    try {
      // Converte a data/hora do Brasil para UTC antes de enviar ao backend
      const dueDateTimeUTC = convertBrazilToUTC(formData.date, formData.time || "12:00");

      await cardTaskService.create({
        card_id: cardId,
        title: formData.title,
        task_type: formData.type,
        due_date: dueDateTimeUTC,
        priority: formData.priority,
        description: formData.description,
        notes: formData.notes || undefined,
        location: formData.location || undefined,
        duration_minutes: parseInt(formData.duration),
        video_link: formData.video_link || undefined,
        status: "free", // Define como "free" por padrão (campo mantido no backend)
      });

      // Reset form
      setFormData({
        title: "",
        type: "call",
        date: defaultDate ?? getTodayDate(),
        time: getNowTime(),
        duration: "30",
        priority: "normal",
        description: "",
        notes: "",
        location: "",
        video_link: "",
        participants: [],
      });
      setIsExpanded(false);
      onSave();
    } catch (error) {
      console.error("Erro ao criar atividade:", error);
      showError("Erro ao criar atividade");
    }
  };

  /**
   * Cancela e fecha o formulário
   */
  const handleCancel = () => {
    setIsExpanded(false);
    onCancel();
  };

  const handleExpand = () => {
    setFormData(prev => ({
      ...prev,
      date: defaultDate ?? getTodayDate(),
      time: getNowTime()
    }));
    setIsExpanded(true);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-slate-900 dark:text-emerald-300 transition-colors hover:bg-emerald-500/25 hover:text-slate-900 dark:hover:text-emerald-200"
      >
        <Plus size={18} />
        <span>Adicionar Atividades</span>
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
      {/* Título */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-400 dark:text-slate-400">Título da atividade *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título da atividade..."
          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
      </div>

      {/* Tipos de atividade */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-400 dark:text-slate-400">Tipo de atividade</label>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {activityTypes.map((activityType) => (
            <button
              key={activityType.type}
              onClick={() => setFormData({ ...formData, type: activityType.type })}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${getTypeColorClasses(
                activityType.type,
                formData.type === activityType.type
              )}`}
            >
              {activityType.icon}
              <span className="hidden lg:inline">{activityType.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data, Hora e Duração */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Data</label>
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="activity-picker-input w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 pr-10 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                dateInputRef.current?.showPicker?.();
                dateInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:text-white/80 dark:hover:text-white"
              aria-label="Selecionar data"
            >
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Hora</label>
          <div className="relative">
            <input
              ref={timeInputRef}
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="activity-picker-input w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 pr-10 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                timeInputRef.current?.showPicker?.();
                timeInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:text-white/80 dark:hover:text-white"
              aria-label="Selecionar hora"
            >
              <Clock size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Duração (min)</label>
          <input
            type="number"
            min="5"
            step="5"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Prioridade */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-400 dark:text-slate-400">Prioridade</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFormData({ ...formData, priority: "normal" })}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${getPriorityClasses(
              "normal",
              formData.priority === "normal"
            )}`}
          >
            Normal
          </button>
          <button
            onClick={() => setFormData({ ...formData, priority: "high" })}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${getPriorityClasses(
              "high",
              formData.priority === "high"
            )}`}
          >
            Alta
          </button>
          <button
            onClick={() => setFormData({ ...formData, priority: "urgent" })}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${getPriorityClasses(
              "urgent",
              formData.priority === "urgent"
            )}`}
          >
            Urgente
          </button>
        </div>
      </div>

      {/* Descrição (obrigatória) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
          Descrição *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva a atividade..."
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Notas (opcional) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">
          Notas adicionais (opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Adicionar notas extras..."
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Opções adicionais */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-400">Opções adicionais</label>

        {/* Localização */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Adicionar localização..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Link de videochamada */}
        <div className="flex items-center gap-2">
          <Video size={16} className="text-slate-400 dark:text-slate-500" />
          <input
            type="url"
            value={formData.video_link}
            onChange={(e) => setFormData({ ...formData, video_link: e.target.value })}
            placeholder="Link da videochamada (Google Meet, Zoom, etc.)"
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
        <button
          onClick={handleCancel}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          <X size={18} />
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Save size={18} />
          Salvar atividade
        </button>
      </div>
    </div>
  );
};

export default QuickActivityForm;
