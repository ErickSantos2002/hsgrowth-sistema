import React, { useState } from "react";
import {
  Phone,
  Users,
  CheckSquare,
  Clock,
  Mail,
  Coffee,
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

interface QuickActivityFormProps {
  cardId: number;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Tipos de atividade disponíveis
 */
type ActivityType = "call" | "meeting" | "task" | "deadline" | "email" | "lunch" | "other";

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
const QuickActivityForm: React.FC<QuickActivityFormProps> = ({ cardId, onSave, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "call" as ActivityType,
    date: "",
    time: "",
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
    { type: "meeting", label: "Reunião", icon: <Users size={16} />, color: "purple" },
    { type: "task", label: "Tarefa", icon: <CheckSquare size={16} />, color: "green" },
    { type: "deadline", label: "Prazo", icon: <Clock size={16} />, color: "red" },
    { type: "email", label: "E-mail", icon: <Mail size={16} />, color: "cyan" },
    { type: "lunch", label: "Almoço", icon: <Coffee size={16} />, color: "orange" },
    { type: "other", label: "Outro", icon: <MoreHorizontal size={16} />, color: "slate" },
  ];

  /**
   * Retorna classes CSS para o tipo de atividade selecionado
   */
  const getTypeColorClasses = (type: ActivityType, isSelected: boolean) => {
    const configs = {
      call: isSelected
        ? "bg-blue-500/30 text-blue-400 border-blue-500"
        : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
      meeting: isSelected
        ? "bg-purple-500/30 text-purple-400 border-purple-500"
        : "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20",
      task: isSelected
        ? "bg-green-500/30 text-green-400 border-green-500"
        : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20",
      deadline: isSelected
        ? "bg-red-500/30 text-red-400 border-red-500"
        : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20",
      email: isSelected
        ? "bg-cyan-500/30 text-cyan-400 border-cyan-500"
        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20",
      lunch: isSelected
        ? "bg-orange-500/30 text-orange-400 border-orange-500"
        : "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
      other: isSelected
        ? "bg-slate-500/30 text-slate-400 border-slate-500"
        : "bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20",
    };
    return configs[type];
  };

  /**
   * Retorna classes CSS para prioridade
   */
  const getPriorityClasses = (priority: string, isSelected: boolean) => {
    const configs = {
      normal: isSelected
        ? "bg-slate-500/30 text-slate-300 border-slate-500"
        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700",
      high: isSelected
        ? "bg-yellow-500/30 text-yellow-400 border-yellow-500"
        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700",
      urgent: isSelected
        ? "bg-red-500/30 text-red-400 border-red-500"
        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700",
    };
    return configs[priority as keyof typeof configs];
  };

  /**
   * Salva a atividade
   */
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Por favor, preencha o título da atividade");
      return;
    }

    if (!formData.description.trim()) {
      alert("Por favor, preencha a descrição da atividade");
      return;
    }

    if (!formData.date) {
      alert("Por favor, selecione uma data");
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
        notes: formData.notes || null,
        location: formData.location || null,
        duration_minutes: parseInt(formData.duration),
        video_link: formData.video_link || null,
        status: "free", // Define como "free" por padrão (campo mantido no backend)
      });

      // Reset form
      setFormData({
        title: "",
        type: "call",
        date: "",
        time: "",
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
      alert("Erro ao criar atividade");
    }
  };

  /**
   * Cancela e fecha o formulário
   */
  const handleCancel = () => {
    setIsExpanded(false);
    onCancel();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-lg text-emerald-300 hover:text-emerald-200 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        <span>Adicionar Atividades</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
      {/* Título */}
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Título da atividade..."
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        autoFocus
      />

      {/* Tipos de atividade */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">Tipo de atividade</label>
        <div className="grid grid-cols-4 gap-2">
          {activityTypes.map((activityType) => (
            <button
              key={activityType.type}
              onClick={() => setFormData({ ...formData, type: activityType.type })}
              className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${getTypeColorClasses(
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
          <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Hora</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Duração (min)</label>
          <input
            type="number"
            min="5"
            step="5"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Prioridade */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">Prioridade</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFormData({ ...formData, priority: "normal" })}
            className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${getPriorityClasses(
              "normal",
              formData.priority === "normal"
            )}`}
          >
            Normal
          </button>
          <button
            onClick={() => setFormData({ ...formData, priority: "high" })}
            className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${getPriorityClasses(
              "high",
              formData.priority === "high"
            )}`}
          >
            Alta
          </button>
          <button
            onClick={() => setFormData({ ...formData, priority: "urgent" })}
            className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${getPriorityClasses(
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
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Descrição *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva a atividade..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Notas (opcional) */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Notas adicionais (opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Adicionar notas extras..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Opções adicionais */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">Opções adicionais</label>

        {/* Localização */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-slate-500" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Adicionar localização..."
            className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Link de videochamada */}
        <div className="flex items-center gap-2">
          <Video size={16} className="text-slate-500" />
          <input
            type="url"
            value={formData.video_link}
            onChange={(e) => setFormData({ ...formData, video_link: e.target.value })}
            placeholder="Link da videochamada (Google Meet, Zoom, etc.)"
            className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 pt-2 border-t border-slate-700/50">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <X size={18} />
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Salvar atividade
        </button>
      </div>
    </div>
  );
};

export default QuickActivityForm;
