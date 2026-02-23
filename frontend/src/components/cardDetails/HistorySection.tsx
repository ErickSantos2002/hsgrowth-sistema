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
  MoreHorizontal,
  Download,
  Printer,
  Search,
  Filter,
  Award,
  XCircle,
  Type,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { convertUTCToBrazil } from "../../utils/timezone";
import { showInfo } from "../../utils/toast";

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
  | "file_deleted"
  | "value_changed"
  | "product_added"
  | "product_removed"
  | "stage_moved"
  | "card_won"
  | "card_lost"
  | "title_changed"
  | "assigned_changed"
  | "person_linked"
  | "person_unlinked"
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
      // Atividades (tarefas)
      task_created: "activity_created",
      task_completed: "activity_completed",
      task_edited: "activity_edited",
      task_deleted: "activity_deleted",
      task_reopened: "activity_created",
      // Anotações
      note_added: "note_added",
      note_edited: "note_added",
      note_deleted: "activity_deleted",
      // Arquivos
      file_attached: "file_attached",
      file_deleted: "file_deleted",
      // Alterações no card
      card_moved: "stage_moved",
      card_won: "card_won",
      card_lost: "card_lost",
      card_title_changed: "title_changed",
      card_value_changed: "value_changed",
      card_assigned_changed: "assigned_changed",
      card_due_date_changed: "due_date_changed",
      // Vínculos de pessoas e organizações
      person_linked: "person_linked",
      person_unlinked: "person_unlinked",
      organization_changed: "organization_changed",
      // Produtos
      product_added: "product_added",
      product_removed: "product_removed",
      // Outros tipos legados (mantidos por compatibilidade)
      value_changed: "value_changed",
      stage_moved: "stage_moved",
      assigned_changed: "assigned_changed",
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
      // Atividades (tarefas)
      activity_completed: <CheckCircle2 size={18} className="text-emerald-400" />,
      activity_created: <Clock size={18} className="text-blue-400" />,
      activity_edited: <Edit size={18} className="text-yellow-400" />,
      activity_deleted: <Trash2 size={18} className="text-red-400" />,
      // Anotações
      note_added: <FileText size={18} className="text-purple-400" />,
      // Arquivos
      file_attached: <Paperclip size={18} className="text-cyan-400" />,
      file_deleted: <Paperclip size={18} className="text-red-400" />,
      // Alterações financeiras e de valor
      value_changed: <DollarSign size={18} className="text-green-400" />,
      // Produtos
      product_added: <Package size={18} className="text-blue-400" />,
      product_removed: <Package size={18} className="text-red-400" />,
      // Movimentação de etapas e status
      stage_moved: <ArrowRight size={18} className="text-indigo-400" />,
      card_won: <Award size={18} className="text-yellow-400" />,
      card_lost: <XCircle size={18} className="text-red-400" />,
      // Alterações de campos
      title_changed: <Type size={18} className="text-orange-400" />,
      assigned_changed: <User size={18} className="text-orange-400" />,
      person_linked: <UserPlus size={18} className="text-emerald-400" />,
      person_unlinked: <UserMinus size={18} className="text-red-400" />,
      organization_changed: <Building2 size={18} className="text-slate-400 dark:text-slate-400" />,
      due_date_changed: <Calendar size={18} className="text-yellow-400" />,
      // Tags
      tag_added: <Tag size={18} className="text-pink-400" />,
      tag_removed: <Tag size={18} className="text-red-400" />,
    };
    return iconMap[type] || <MoreHorizontal size={18} className="text-slate-400 dark:text-slate-400" />;
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
        filtered = filtered.filter((e) => e.type === "file_attached" || e.type === "file_deleted");
        break;
      case "changes":
        // Todos os eventos que representam mudanças no card (não tarefas, notas nem arquivos)
        filtered = filtered.filter((e) =>
          [
            "value_changed",
            "title_changed",
            "product_added",
            "product_removed",
            "stage_moved",
            "card_won",
            "card_lost",
            "assigned_changed",
            "person_linked",
            "person_unlinked",
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

  // Contagem de eventos por tipo (para badges das abas)
  const activityCount = historyEvents.filter((e) =>
    ["activity_completed", "activity_created", "activity_edited", "activity_deleted"].includes(e.type)
  ).length;
  const noteCount = historyEvents.filter((e) => e.type === "note_added").length;
  const fileCount = historyEvents.filter(
    (e) => e.type === "file_attached" || e.type === "file_deleted"
  ).length;
  const changesCount = historyEvents.filter((e) =>
    [
      "value_changed",
      "title_changed",
      "product_added",
      "product_removed",
      "stage_moved",
      "card_won",
      "card_lost",
      "assigned_changed",
      "person_linked",
      "person_unlinked",
      "organization_changed",
      "due_date_changed",
      "tag_added",
      "tag_removed",
    ].includes(e.type)
  ).length;

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Histórico</h3>

      {/* Sub-abas do histórico */}
      <div className="mb-4 border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
              activeTab === "all"
                ? "border-blue-500 font-medium text-blue-400"
                : "border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
              activeTab === "activities"
                ? "border-blue-500 font-medium text-blue-400"
                : "border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Atividades
            <span className="ml-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-400">
              {activityCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
              activeTab === "notes"
                ? "border-blue-500 font-medium text-blue-400"
                : "border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Anotações
            <span className="ml-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-400">
              {noteCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
              activeTab === "files"
                ? "border-blue-500 font-medium text-blue-400"
                : "border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Arquivos
            <span className="ml-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-400">
              {fileCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("changes")}
            className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
              activeTab === "changes"
                ? "border-blue-500 font-medium text-blue-400"
                : "border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Alterações
            <span className="ml-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-400">
              {changesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de ferramentas */}
      <div className="mb-4 flex items-center gap-2">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Botões de ação */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-400 dark:text-slate-400 transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Filtros"
        >
          <Filter size={16} />
        </button>

        <button
          onClick={() => showInfo("Exportar histórico - Funcionalidade em desenvolvimento")}
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-400 dark:text-slate-400 transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Exportar"
        >
          <Download size={16} />
        </button>

        <button
          onClick={() => showInfo("Imprimir histórico - Funcionalidade em desenvolvimento")}
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-3 py-2 text-slate-400 dark:text-slate-400 transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
          title="Imprimir"
        >
          <Printer size={16} />
        </button>
      </div>

      {/* Timeline de eventos */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-8 text-center">
            <FileText size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-400">
              {searchTerm ? "Nenhum evento encontrado" : "Nenhum evento nesta categoria"}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/30"
            >
              <div className="flex items-start gap-3">
                {/* Ícone do tipo de evento */}
                <div className="mt-0.5">{getEventIcon(event.type)}</div>

                {/* Conteúdo do evento */}
                <div className="min-w-0 flex-1">
                  <p
                    className="history-html overflow-wrap-anywhere mb-1 whitespace-pre-wrap break-words font-medium text-slate-900 dark:text-white"
                    dangerouslySetInnerHTML={{ __html: event.title }}
                  />

                  {event.description && (
                    <p className="mb-2 whitespace-pre-wrap break-words text-sm text-slate-400 dark:text-slate-400">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-medium text-slate-900 dark:text-white">
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
          <p className="text-xs text-slate-400 dark:text-slate-500">Mostrando {filteredEvents.length} eventos</p>
        </div>
      )}
    </div>
  );
};

export default HistorySection;
