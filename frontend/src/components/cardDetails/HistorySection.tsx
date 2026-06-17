import React, { useState, useMemo } from "react";
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
  Search,
  Award,
  XCircle,
  Type,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { convertUTCToBrazil } from "../../utils/timezone";
import ExpandableText from "../common/ExpandableText";

interface HistorySectionProps {
  activities: any[];
  notes?: any[];
}

type HistoryTab = "all" | "activities" | "notes" | "files" | "changes";

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

interface EventGroup {
  key: string;
  mainEvent: HistoryEvent;
  subEvents: HistoryEvent[];
  representativeDate: string;
}

// Tipos de evento que pertencem a tarefas e podem ser agrupados
const TASK_EVENT_TYPES = new Set<EventType>([
  "activity_created",
  "activity_completed",
  "activity_edited",
  "activity_deleted",
]);

const HistorySection: React.FC<HistorySectionProps> = ({ activities, notes = [] }) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const mapActivityType = (backendType: string): EventType => {
    const typeMap: Record<string, EventType> = {
      task_created: "activity_created",
      task_completed: "activity_completed",
      task_edited: "activity_edited",
      task_deleted: "activity_deleted",
      task_reopened: "activity_created",
      note_added: "note_added",
      note_edited: "note_added",
      note_deleted: "activity_deleted",
      file_attached: "file_attached",
      file_deleted: "file_deleted",
      card_moved: "stage_moved",
      card_won: "card_won",
      card_lost: "card_lost",
      card_title_changed: "title_changed",
      card_value_changed: "value_changed",
      card_assigned_changed: "assigned_changed",
      card_due_date_changed: "due_date_changed",
      person_linked: "person_linked",
      person_unlinked: "person_unlinked",
      organization_changed: "organization_changed",
      product_added: "product_added",
      product_removed: "product_removed",
      value_changed: "value_changed",
      stage_moved: "stage_moved",
      assigned_changed: "assigned_changed",
      due_date_changed: "due_date_changed",
      tag_added: "tag_added",
      tag_removed: "tag_removed",
    };
    return typeMap[backendType] || "activity_created";
  };

  const activityEvents: HistoryEvent[] = useMemo(
    () =>
      (activities || []).map((act: any) => {
        const meta = act.activity_metadata || {};
        const parts: string[] = [];
        if (meta.task_description) parts.push(`Descrição: ${meta.task_description}`);
        if (meta.task_notes) parts.push(`Notas: ${meta.task_notes}`);
        let description = parts.join("\n\n");
        if (!description && meta.task_title && meta.task_title !== act.description) {
          description = meta.task_title;
        }
        return {
          id: act.id,
          type: mapActivityType(act.activity_type),
          title: act.description || "Evento",
          description,
          user_name: act.user?.name || "Sistema",
          created_at: act.created_at,
          metadata: meta,
        };
      }),
    [activities]
  );

  const noteEvents: HistoryEvent[] = useMemo(
    () =>
      (notes || []).map((note: any) => ({
        id: note.id,
        type: "note_added" as EventType,
        title: note.content || "Nota",
        description: "",
        user_name: note.user_name || "Sistema",
        created_at: note.created_at,
        metadata: {},
      })),
    [notes]
  );

  const historyEvents: HistoryEvent[] = useMemo(
    () =>
      [...activityEvents, ...noteEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [activityEvents, noteEvents]
  );

  const getEventIcon = (type: EventType, size = 18) => {
    const iconMap: Record<EventType, React.ReactNode> = {
      activity_completed: <CheckCircle2 size={size} className="text-emerald-400" />,
      activity_created: <Clock size={size} className="text-blue-400" />,
      activity_edited: <Edit size={size} className="text-yellow-400" />,
      activity_deleted: <Trash2 size={size} className="text-red-400" />,
      note_added: <FileText size={size} className="text-purple-400" />,
      file_attached: <Paperclip size={size} className="text-cyan-400" />,
      file_deleted: <Paperclip size={size} className="text-red-400" />,
      value_changed: <DollarSign size={size} className="text-green-400" />,
      product_added: <Package size={size} className="text-blue-400" />,
      product_removed: <Package size={size} className="text-red-400" />,
      stage_moved: <ArrowRight size={size} className="text-indigo-400" />,
      card_won: <Award size={size} className="text-yellow-400" />,
      card_lost: <XCircle size={size} className="text-red-400" />,
      title_changed: <Type size={size} className="text-orange-400" />,
      assigned_changed: <User size={size} className="text-orange-400" />,
      person_linked: <UserPlus size={size} className="text-emerald-400" />,
      person_unlinked: <UserMinus size={size} className="text-red-400" />,
      organization_changed: <Building2 size={size} className="text-slate-400" />,
      due_date_changed: <Calendar size={size} className="text-yellow-400" />,
      tag_added: <Tag size={size} className="text-pink-400" />,
      tag_removed: <Tag size={size} className="text-red-400" />,
    };
    return iconMap[type] || <MoreHorizontal size={size} className="text-slate-400" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = convertUTCToBrazil(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return `Ontem, ${timeStr}`;
    if (diffDays < 7) return `${diffDays} dias atrás, ${timeStr}`;
    return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}, ${timeStr}`;
  };

  const getFilteredEvents = (): HistoryEvent[] => {
    let filtered = historyEvents;
    switch (activeTab) {
      case "activities":
        filtered = filtered.filter((e) => TASK_EVENT_TYPES.has(e.type));
        break;
      case "notes":
        filtered = filtered.filter((e) => e.type === "note_added");
        break;
      case "files":
        filtered = filtered.filter((e) => e.type === "file_attached" || e.type === "file_deleted");
        break;
      case "changes":
        filtered = filtered.filter((e) =>
          [
            "value_changed", "title_changed", "product_added", "product_removed",
            "stage_moved", "card_won", "card_lost", "assigned_changed",
            "person_linked", "person_unlinked", "organization_changed",
            "due_date_changed", "tag_added", "tag_removed",
          ].includes(e.type)
        );
        break;
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  // Agrupa eventos de tarefas pelo task_id; demais ficam soltos
  const groupedEvents: EventGroup[] = useMemo(() => {
    const filtered = getFilteredEvents();
    const taskGroups = new Map<number, HistoryEvent[]>();
    const standalone: HistoryEvent[] = [];

    for (const event of filtered) {
      const taskId = event.metadata?.task_id;
      if (TASK_EVENT_TYPES.has(event.type) && taskId) {
        if (!taskGroups.has(taskId)) taskGroups.set(taskId, []);
        taskGroups.get(taskId)!.push(event);
      } else {
        standalone.push(event);
      }
    }

    const result: EventGroup[] = [];

    for (const [taskId, events] of taskGroups) {
      const sorted = [...events].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      result.push({
        key: `task-${taskId}`,
        mainEvent: sorted[0],
        subEvents: sorted.slice(1),
        representativeDate: sorted[0].created_at,
      });
    }

    for (const event of standalone) {
      result.push({
        key: `event-${event.id}`,
        mainEvent: event,
        subEvents: [],
        representativeDate: event.created_at,
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.representativeDate).getTime() - new Date(a.representativeDate).getTime()
    );
  }, [historyEvents, activeTab, searchTerm]);

  // Contagens para badges das abas (usando eventos brutos)
  const activityCount = historyEvents.filter((e) => TASK_EVENT_TYPES.has(e.type)).length;
  const noteCount = historyEvents.filter((e) => e.type === "note_added").length;
  const fileCount = historyEvents.filter(
    (e) => e.type === "file_attached" || e.type === "file_deleted"
  ).length;
  const changesCount = historyEvents.filter((e) =>
    [
      "value_changed", "title_changed", "product_added", "product_removed",
      "stage_moved", "card_won", "card_lost", "assigned_changed",
      "person_linked", "person_unlinked", "organization_changed",
      "due_date_changed", "tag_added", "tag_removed",
    ].includes(e.type)
  ).length;

  const renderEventRow = (event: HistoryEvent, compact = false) => (
    <div className={`flex items-start gap-3 ${compact ? "" : ""}`}>
      <div className="mt-0.5 flex-shrink-0">{getEventIcon(event.type, compact ? 15 : 18)}</div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <ExpandableText
          htmlContent={event.title}
          maxLines={5}
          className={`history-html overflow-wrap-anywhere whitespace-pre-wrap break-words font-medium text-slate-900 dark:text-white ${compact ? "text-sm mb-0.5" : "mb-1"}`}
        />
        {event.description && (
          <ExpandableText
            content={event.description}
            maxLines={compact ? 2 : 5}
            className={`whitespace-pre-wrap break-words text-slate-400 dark:text-slate-400 ${compact ? "text-xs mb-0.5" : "text-sm mb-2"}`}
          />
        )}
        <div className={`flex items-center gap-2 text-slate-400 dark:text-slate-500 mt-0.5 ${compact ? "text-xs" : "text-xs"}`}>
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
      {!compact && (
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-medium text-white">
          {event.user_name.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Histórico</h3>

      {/* Sub-abas */}
      <div className="mb-4 border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="flex gap-4 overflow-x-auto">
          {(
            [
              { key: "all", label: "Todos", count: null },
              { key: "activities", label: "Atividades", count: activityCount },
              { key: "notes", label: "Anotações", count: noteCount },
              { key: "files", label: "Arquivos", count: fileCount },
              { key: "changes", label: "Alterações", count: changesCount },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pb-2 text-sm transition-colors ${
                activeTab === key
                  ? "border-blue-500 font-medium text-blue-400"
                  : "border-transparent text-slate-900 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {label}
              {count !== null && (
                <span className="ml-1 rounded bg-gray-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-400">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de ferramentas */}
      <div className="mb-4 flex items-center gap-2">
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
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {groupedEvents.length === 0 ? (
          <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-8 text-center">
            <FileText size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-400">
              {searchTerm ? "Nenhum evento encontrado" : "Nenhum evento nesta categoria"}
            </p>
          </div>
        ) : (
          groupedEvents.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const hasSubEvents = group.subEvents.length > 0;
            const subCount = group.subEvents.length;

            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50"
              >
                {/* Evento principal */}
                <div className="p-4 transition-colors hover:bg-slate-700/20">
                  {renderEventRow(group.mainEvent)}

                  {/* Botão expandir sub-eventos */}
                  {hasSubEvents && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="mt-3 flex items-center gap-1.5 rounded-md border border-gray-200/50 dark:border-slate-700/50 bg-gray-200/30 dark:bg-slate-700/30 px-2.5 py-1 text-xs text-slate-400 dark:text-slate-500 transition-colors hover:bg-gray-200/60 dark:hover:bg-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={13} />
                          Ocultar registros anteriores
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} />
                          {subCount} registro{subCount > 1 ? "s" : ""} anterior{subCount > 1 ? "es" : ""}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-eventos (colapsáveis) */}
                {hasSubEvents && isExpanded && (
                  <div className="border-t border-gray-200/50 dark:border-slate-700/50">
                    {group.subEvents.map((subEvent, idx) => (
                      <div
                        key={subEvent.id}
                        className={`px-4 py-3 transition-colors hover:bg-slate-700/10 ${
                          idx < group.subEvents.length - 1
                            ? "border-b border-gray-200/30 dark:border-slate-700/30"
                            : ""
                        }`}
                      >
                        {renderEventRow(subEvent, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {groupedEvents.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Mostrando {groupedEvents.length} {groupedEvents.length === 1 ? "item" : "itens"}
          </p>
        </div>
      )}
    </div>
  );
};

export default HistorySection;
