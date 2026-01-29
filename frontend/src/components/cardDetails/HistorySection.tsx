import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  FileText,
  Paperclip,
  DollarSign,
  Package,
  ArrowRight,
  User,
  Building2,
  Calendar,
  Tag,
  Phone,
  Users,
  CheckSquare,
  Mail,
  Coffee,
  MoreHorizontal,
  Download,
  Printer,
  Search,
  Filter,
} from "lucide-react";
import { convertUTCToBrazil } from "../../utils/timezone";

interface HistorySectionProps {
  activities: any[];
  notes?: any[];
}

/**
 * Tipos de sub-abas do histórico
 */
type HistoryTab = "all" | "activities" | "notes" | "files" | "changes";

/**
 * Tipos de eventos do histórico
 */
type EventType =
  | "activity_completed"
  | "activity_created"
  | "activity_edited"
  | "activity_deleted"
  | "note_added"
  | "file_attached"
  | "value_changed"
  | "product_added"
  | "product_removed"
  | "stage_moved"
  | "assigned_changed"
  | "organization_changed"
  | "due_date_changed"
  | "tag_added"
  | "tag_removed";

/**
 * Interface de evento do histórico
 */
interface HistoryEvent {
  id: number;
  type: EventType;
  title: string;
  description?: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Seção "Histórico" - Timeline completo de eventos do card
 * Exibida na aba "Atividade", abaixo da seção "Foco"
 */
const HistorySection: React.FC<HistorySectionProps> = ({ activities, notes = [] }) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Usa os dados que vem do backend e mapeia os tipos corretamente
  const mapActivityType = (backendType: string): EventType => {
    const typeMap: Record<string, EventType> = {
      task_created: "activity_created",
      task_completed: "activity_completed",
      task_edited: "activity_edited",
      task_deleted: "activity_deleted",
      task_reopened: "activity_created",
      note_added: "note_added",
      file_attached: "file_attached",
      value_changed: "value_changed",
      product_added: "product_added",
      product_removed: "product_removed",
      stage_moved: "stage_moved",
      assigned_changed: "assigned_changed",
      organization_changed: "organization_changed",
      due_date_changed: "due_date_changed",
      tag_added: "tag_added",
      tag_removed: "tag_removed",
    };
    return typeMap[backendType] || "activity_created";
  };

  const activityEvents: HistoryEvent[] = (activities || []).map((act: any) => ({
    id: act.id,
    type: mapActivityType(act.activity_type),
    title: act.description || "Evento",
    description: act.activity_metadata?.task_title || "",
    user_name: act.user?.name || "Sistema",
    created_at: act.created_at,
    metadata: act.activity_metadata || {},
  }));

  const noteEvents: HistoryEvent[] = (notes || []).map((note: any) => ({
    id: note.id,
    type: "note_added",
    title: note.content || "Nota",
    description: "",
    user_name: note.user_name || "Sistema",
    created_at: note.created_at,
    metadata: {},
  }));

  const historyEvents: HistoryEvent[] = [...activityEvents, ...noteEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Dados mockados removidos - comentados para referência
  const _mockData: HistoryEvent[] = [
    {
      id: 1,
      type: "activity_completed",
      title: "Reunião de apresentação do produto",
      description: "Cliente demonstrou muito interesse na solução",
      user_name: "João Silva",
      created_at: "2026-01-27T10:30:00",
      metadata: { activity_type: "meeting", contact_name: "Maria Santos" },
    },
    {
      id: 2,
      type: "note_added",
      title: "Cliente solicitou desconto adicional de 5%",
      description:
        "Mencionou que concorrente ofereceu condição melhor. Avaliar viabilidade do desconto.",
      user_name: "João Silva",
      created_at: "2026-01-27T09:15:00",
    },
    {
      id: 3,
      type: "value_changed",
      title: "Valor alterado",
      description: "De R$ 50.000,00 para R$ 47.500,00",
      user_name: "João Silva",
      created_at: "2026-01-26T16:45:00",
      metadata: { old_value: 50000, new_value: 47500 },
    },
    {
      id: 4,
      type: "product_added",
      title: "Produto adicionado: Software de Gestão - Licença Anual",
      description: "Quantidade: 2 | Valor unitário: R$ 2.400,00",
      user_name: "João Silva",
      created_at: "2026-01-26T16:40:00",
    },
    {
      id: 5,
      type: "stage_moved",
      title: "Movido de \"Proposta\" para \"Negociação\"",
      user_name: "João Silva",
      created_at: "2026-01-25T14:20:00",
      metadata: { from_stage: "Proposta", to_stage: "Negociação" },
    },
    {
      id: 6,
      type: "file_attached",
      title: "Arquivo anexado: Proposta_Comercial_v2.pdf",
      description: "Tamanho: 2.3 MB",
      user_name: "João Silva",
      created_at: "2026-01-25T11:30:00",
    },
    {
      id: 7,
      type: "activity_created",
      title: "Atividade agendada: Ligar para apresentar proposta",
      description: "Agendado para 25/01/2026 às 10:00",
      user_name: "João Silva",
      created_at: "2026-01-24T15:00:00",
      metadata: { activity_type: "call" },
    },
  ];

  /**
   * Retorna ícone do tipo de evento
   */
  const getEventIcon = (type: EventType) => {
    const iconMap: Record<EventType, React.ReactNode> = {
      activity_completed: <CheckCircle2 size={18} className="text-emerald-400" />,
      activity_created: <Clock size={18} className="text-blue-400" />,
      activity_edited: <Edit size={18} className="text-yellow-400" />,
      activity_deleted: <Trash2 size={18} className="text-red-400" />,
      note_added: <FileText size={18} className="text-purple-400" />,
      file_attached: <Paperclip size={18} className="text-cyan-400" />,
      value_changed: <DollarSign size={18} className="text-green-400" />,
      product_added: <Package size={18} className="text-blue-400" />,
      product_removed: <Package size={18} className="text-red-400" />,
      stage_moved: <ArrowRight size={18} className="text-indigo-400" />,
      assigned_changed: <User size={18} className="text-orange-400" />,
      organization_changed: <Building2 size={18} className="text-slate-400" />,
      due_date_changed: <Calendar size={18} className="text-yellow-400" />,
      tag_added: <Tag size={18} className="text-pink-400" />,
      tag_removed: <Tag size={18} className="text-red-400" />,
    };
    return iconMap[type] || <MoreHorizontal size={18} className="text-slate-400" />;
  };

  /**
   * Formata data/hora relativa considerando o horário do Brasil
   */
  const formatRelativeTime = (dateStr: string) => {
    // Converte a data UTC do backend para o horário do Brasil
    const date = convertUTCToBrazil(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  /**
   * Filtra eventos com base na aba ativa e busca
   */
  const getFilteredEvents = () => {
    let filtered = historyEvents;

    // Filtro por aba
    switch (activeTab) {
      case "activities":
        filtered = filtered.filter((e) =>
          ["activity_completed", "activity_created", "activity_edited", "activity_deleted"].includes(
            e.type
          )
        );
        break;
      case "notes":
        filtered = filtered.filter((e) => e.type === "note_added");
        break;
      case "files":
        filtered = filtered.filter((e) => e.type === "file_attached");
        break;
      case "changes":
        filtered = filtered.filter((e) =>
          [
            "value_changed",
            "product_added",
            "product_removed",
            "stage_moved",
            "assigned_changed",
            "organization_changed",
            "due_date_changed",
            "tag_added",
            "tag_removed",
          ].includes(e.type)
        );
        break;
      default:
        // "all" - mostra tudo
        break;
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  // Contagem de eventos por tipo
  const activityCount = historyEvents.filter((e) =>
    ["activity_completed", "activity_created", "activity_edited", "activity_deleted"].includes(e.type)
  ).length;
  const noteCount = historyEvents.filter((e) => e.type === "note_added").length;
  const fileCount = historyEvents.filter((e) => e.type === "file_attached").length;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Histórico</h3>

      {/* Sub-abas do histórico */}
      <div className="border-b border-slate-700/50 mb-4">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => setActiveTab("activities")}
            className={`pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm flex items-center gap-1 ${
              activeTab === "activities"
                ? "border-blue-500 text-blue-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Atividades
            <span className="ml-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
              {activityCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm flex items-center gap-1 ${
              activeTab === "notes"
                ? "border-blue-500 text-blue-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Anotações
            <span className="ml-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
              {noteCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === "files"
                ? "border-blue-500 text-blue-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Arquivos
          </button>

          <button
            onClick={() => setActiveTab("changes")}
            className={`pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === "changes"
                ? "border-blue-500 text-blue-400 font-medium"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Alterações
          </button>
        </div>
      </div>

      {/* Barra de ferramentas */}
      <div className="flex items-center gap-2 mb-4">
        {/* Campo de busca */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Botões de ação */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Filtros"
        >
          <Filter size={16} />
        </button>

        <button
          onClick={() => alert("Exportar histórico - será implementado")}
          className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Exportar"
        >
          <Download size={16} />
        </button>

        <button
          onClick={() => alert("Imprimir histórico - será implementado")}
          className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Imprimir"
        >
          <Printer size={16} />
        </button>
      </div>

      {/* Timeline de eventos */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-8 bg-slate-800/30 border border-slate-700/50 rounded-lg text-center">
            <FileText size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">
              {searchTerm ? "Nenhum evento encontrado" : "Nenhum evento nesta categoria"}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Ícone do tipo de evento */}
                <div className="mt-0.5">{getEventIcon(event.type)}</div>

                {/* Conteúdo do evento */}
                <div className="flex-1 min-w-0">
                  <p
                    className="history-html font-medium text-white mb-1 break-words whitespace-pre-wrap overflow-wrap-anywhere"
                    dangerouslySetInnerHTML={{ __html: event.title }}
                  />

                  {event.description && (
                    <p className="text-sm text-slate-400 mb-2 break-words whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatRelativeTime(event.created_at)}</span>
                    <span>•</span>
                    <span>{event.user_name}</span>
                    {event.metadata?.contact_name && (
                      <>
                        <span>•</span>
                        <span>{event.metadata.contact_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Avatar do usuário */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-xs">
                  {event.user_name.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Indicador de scroll infinito (placeholder) */}
      {filteredEvents.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">Mostrando {filteredEvents.length} eventos</p>
        </div>
      )}
    </div>
  );
};

export default HistorySection;
