import React, { useState } from "react";
import {
  Check,
  Calendar,
  Phone,
  Users,
  FileText,
  MapPin,
  Video,
  DollarSign,
  Building2,
  User,
  Layers,
  SkipForward,
  ClipboardList,
  UserCheck,
  Hash,
  Mail,
  Smartphone,
  PhoneCall,
  Pencil,
} from "lucide-react";
import cardTaskService, { CardTask } from "../../services/cardTaskService";
import { CardNote } from "../../services/cardNoteService";
import { Card } from "../../types";
import { ActivityActionsResult } from "../../hooks/useActivityActions";
import { Button, BaseModal, Input, Select } from "../common";
import StatusBadge from "../cardDetails/StatusBadge";
import {
  formatBrazilDateTime,
  extractBrazilDateForInput,
  extractBrazilTimeForInput,
  getActivityStatusBrazil,
} from "../../utils/timezone";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../../constants/cardTaskConfig";

interface FocusModeCardProps {
  task: CardTask;
  cardInfo: Card | null;
  cardNotes: CardNote[];
  loadingCard: boolean;
  isViewer: boolean;
  actions: ActivityActionsResult;
  onSkip: () => void;
  onUpdate: (updated: CardTask) => void;
}

/**
 * Conteúdo interno do FocusMode.
 *
 * Layout duas colunas:
 * - Esquerda (30%): resumo do negócio (card, cliente, valor, etapa, responsável)
 * - Direita (70%): detalhes da atividade + botões de ação
 *
 * Botões especiais:
 * - "Ligar": apenas para task_type === "call" (requer cardInfo carregado)
 * - "NoShow": apenas para task_type === "meeting"
 */
const FocusModeCard: React.FC<FocusModeCardProps> = ({
  task,
  cardInfo,
  cardNotes,
  loadingCard,
  isViewer,
  actions,
  onSkip,
  onUpdate,
}) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(
    task.due_date ? extractBrazilDateForInput(task.due_date) : ""
  );
  const [rescheduleTime, setRescheduleTime] = useState(
    task.due_date ? extractBrazilTimeForInput(task.due_date) : ""
  );

  // Estado do painel de edição
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");
  const [editNotes, setEditNotes] = useState(task.notes ?? "");
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editLocation, setEditLocation] = useState((task as any).location ?? "");
  const [editVideoLink, setEditVideoLink] = useState((task as any).video_link ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = () => {
    // Reinicia os campos com os valores atuais da tarefa
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditNotes(task.notes ?? "");
    setEditPriority(task.priority);
    setEditLocation((task as any).location ?? "");
    setEditVideoLink((task as any).video_link ?? "");
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const updated = await cardTaskService.update(task.id, {
        title: editTitle,
        description: editDescription || undefined,
        notes: editNotes || undefined,
        priority: editPriority,
        location: editLocation || undefined,
        video_link: editVideoLink || undefined,
      });
      onUpdate(updated);
      setShowEdit(false);
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const typeConfig = TYPE_CONFIG[task.task_type] ?? TYPE_CONFIG.other;
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const activityStatus = task.due_date ? getActivityStatusBrazil(task.due_date) : "future";

  const isLoadingComplete = actions.loadingStates[task.id] === "complete";
  const isLoadingReschedule = actions.loadingStates[task.id] === "reschedule";
  const isLoadingCall = actions.loadingStates[task.id] === "call";
  const isLoadingNoShow = actions.loadingStates[task.id] === "noshow";
  const isAnyLoading = actions.loadingStates[task.id] !== undefined;

  const formatCurrency = (value: number | null) => {
    if (value == null) return null;
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleConfirmReschedule = async () => {
    await actions.handleReschedule(task.id, rescheduleDate, rescheduleTime);
    setShowReschedule(false);
  };

  const handleOpenReschedule = () => {
    setRescheduleDate(task.due_date ? extractBrazilDateForInput(task.due_date) : "");
    setRescheduleTime(task.due_date ? extractBrazilTimeForInput(task.due_date) : "");
    setShowReschedule(true);
  };

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50 lg:flex-row">
      {/* ── Coluna esquerda: resumo do negócio (30%) ─────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 p-5 dark:border-slate-700/50 dark:bg-slate-800/50 lg:w-[30%] lg:border-b-0 lg:border-r">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Negócio
        </h3>

        {loadingCard ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-5 animate-pulse rounded bg-gray-200 dark:bg-slate-700"
                style={{ width: `${60 + i * 10}%` }}
              />
            ))}
          </div>
        ) : cardInfo ? (
          <div className="space-y-3 text-sm">
            {/* Título do negócio */}
            <div className="flex items-start gap-2">
              <Layers size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Negócio</p>
                <span className="font-semibold text-slate-900 dark:text-white">{cardInfo.title}</span>
              </div>
            </div>

            {/* Cliente */}
            <div className="flex items-start gap-2">
              <Building2 size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Cliente</p>
                <span className={cardInfo.client_name ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.client_name ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Pessoa de contato */}
            <div className="flex items-start gap-2">
              <User size={14} className="mt-0.5 flex-shrink-0 text-teal-400" />
              <div>
                <p className="text-xs text-slate-400">Pessoa de contato</p>
                <span className={cardInfo.person_name ? "font-medium text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.person_name ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Email da pessoa de contato */}
            <div className="flex items-start gap-2">
              <Mail size={14} className="mt-0.5 flex-shrink-0 text-teal-400" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <span className={cardInfo.person_email ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.person_email ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Telefone principal da pessoa de contato */}
            <div className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 flex-shrink-0 text-teal-400" />
              <div>
                <p className="text-xs text-slate-400">Telefone</p>
                <span className={cardInfo.person_phone ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.person_phone ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* WhatsApp da pessoa de contato */}
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="mt-0.5 flex-shrink-0 text-teal-400" />
              <div>
                <p className="text-xs text-slate-400">WhatsApp</p>
                <span className={cardInfo.person_phone_whatsapp ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.person_phone_whatsapp ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Telefone comercial da pessoa de contato */}
            <div className="flex items-start gap-2">
              <PhoneCall size={14} className="mt-0.5 flex-shrink-0 text-teal-400" />
              <div>
                <p className="text-xs text-slate-400">Tel. Comercial</p>
                <span className={cardInfo.person_phone_commercial ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.person_phone_commercial ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Valor */}
            <div className="flex items-start gap-2">
              <DollarSign size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Valor</p>
                <span className={cardInfo.value != null ? "font-medium text-emerald-600 dark:text-emerald-400" : "italic text-slate-400"}>
                  {cardInfo.value != null ? formatCurrency(cardInfo.value) : "(vazio)"}
                </span>
              </div>
            </div>

            {/* Etapa / Board */}
            <div className="flex items-start gap-2">
              <Layers size={14} className="mt-0.5 flex-shrink-0 text-purple-400" />
              <div>
                <p className="text-xs text-slate-400">Etapa</p>
                <span className={cardInfo.list_name ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.list_name ?? "(vazio)"}
                  {cardInfo.board_name && (
                    <span className="ml-1 text-xs text-slate-400">({cardInfo.board_name})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Responsável */}
            <div className="flex items-start gap-2">
              <User size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-xs text-slate-400">Responsável</p>
                <span className={cardInfo.assigned_to_name ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.assigned_to_name ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* SDR */}
            <div className="flex items-start gap-2">
              <UserCheck size={14} className="mt-0.5 flex-shrink-0 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-400">SDR</p>
                <span className={cardInfo.sdr_name ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.sdr_name ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Data de fechamento esperada */}
            <div className="flex items-start gap-2">
              <Calendar size={14} className="mt-0.5 flex-shrink-0 text-orange-400" />
              <div>
                <p className="text-xs text-slate-400">Fechamento esperado</p>
                <span className={cardInfo.due_date ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.due_date ? formatBrazilDateTime(cardInfo.due_date) : "(vazio)"}
                </span>
              </div>
            </div>

            {/* Atividades pendentes */}
            <div className="flex items-start gap-2">
              <Hash size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Atividades pendentes</p>
                <span className={cardInfo.pending_tasks_count ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400"}>
                  {cardInfo.pending_tasks_count ?? "(vazio)"}
                </span>
              </div>
            </div>

            {/* Descrição do negócio */}
            <div className="flex items-start gap-2 border-t border-gray-200 pt-3 dark:border-slate-700">
              <ClipboardList size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Descrição</p>
                <p className={`text-xs leading-relaxed line-clamp-4 ${cardInfo.description ? "text-slate-600 dark:text-slate-400" : "italic text-slate-400"}`}>
                  {cardInfo.description ?? "(vazio)"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Dados do negócio não disponíveis
          </p>
        )}
      </div>

      {/* ── Coluna direita: detalhes da atividade (70%) ──────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-transparent">
        {/* Container principal rolável (Header + Notas) */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Badges + data */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${typeConfig.pillBg} ${typeConfig.pillText} ${typeConfig.pillBorder}`}
            >
              <typeConfig.Icon size={12} />
              {typeConfig.label}
            </span>
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${priorityConfig.badgeClass}`}>
              {priorityConfig.label}
            </span>
            {task.due_date && <StatusBadge status={activityStatus} />}
            {task.due_date && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatBrazilDateTime(task.due_date)}
              </span>
            )}
          </div>

          {/* Título */}
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{task.title}</h2>

          {/* Descrição */}
          {task.description && (
            <div className="mb-4 flex items-start gap-2 text-sm">
              <FileText size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <p className="text-slate-700 dark:text-slate-300">{task.description}</p>
            </div>
          )}

          {/* Localização */}
          {(task as any).location && (
            <div className="mb-4 flex items-start gap-2 text-sm">
              <MapPin size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <p className="text-slate-700 dark:text-slate-300">{(task as any).location}</p>
            </div>
          )}

          {/* Link de vídeo */}
          {(task as any).video_link && (
            <div className="mb-4 flex items-start gap-2 text-sm">
              <Video size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <a
                href={(task as any).video_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline hover:text-blue-400"
              >
                Entrar na videochamada
              </a>
            </div>
          )}

          {/* Notas */}
          {task.notes && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Notas:</p>
              <p className="text-slate-700 dark:text-slate-300">{task.notes}</p>
            </div>
          )}

          {/* Anotações do negócio — ocupam espaço restante se for > 0 */}
          {cardNotes.length > 0 && (
            <div className="flex flex-col space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Anotações do negócio
              </p>
              <div className="space-y-2">
                {cardNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div
                      className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300 [&>p]:mb-2 [&>p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      {note.user_name && <span className="font-medium">{note.user_name} · </span>}
                      {formatBrazilDateTime(note.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal de edição */}
        {!isViewer && showEdit && (
          <BaseModal
            isOpen={true}
            onClose={() => setShowEdit(false)}
            title="Editar Atividade"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Título *</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Prioridade</label>
                <Select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as CardTask["priority"])}
                  className="w-full py-2 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Notas internas</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {task.task_type === "meeting" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Localização</label>
                  <Input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="py-2 text-sm"
                  />
                </div>
              )}

              {task.task_type === "meeting" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Link de vídeo</label>
                  <Input
                    value={editVideoLink}
                    onChange={(e) => setEditVideoLink(e.target.value)}
                    className="py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editTitle.trim()}
                  loading={savingEdit}
                  icon={<Check size={16} />}
                >
                  Salvar Alterações
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowEdit(false)}
                  disabled={savingEdit}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </BaseModal>
        )}

        {/* Modal de reagendamento */}
        {!isViewer && showReschedule && (
          <BaseModal
            isOpen={true}
            onClose={() => setShowReschedule(false)}
            title="Reagendar Atividade"
            size="sm"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Nova data *
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Horário (opcional)
                </label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmReschedule}
                  disabled={isLoadingReschedule || !rescheduleDate}
                  loading={isLoadingReschedule}
                  icon={<Check size={16} />}
                >
                  Reagendar
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowReschedule(false)}
                  disabled={isLoadingReschedule}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </BaseModal>
        )}

        {/* Footer: Botões de ação */}
        {!isViewer && (
          <div className="flex flex-wrap gap-2 border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
            {/* Ligar — apenas para atividades do tipo "call" */}
            {task.task_type === "call" && cardInfo && (
              <button
                onClick={() => actions.handleMakeCall(task, cardInfo)}
                disabled={isAnyLoading || !cardInfo.person_id}
                title={!cardInfo.person_id ? "Nenhuma pessoa vinculada ao card" : "Ligar agora"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:shadow-none"
              >
                {isLoadingCall ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Phone size={18} />
                )}
              </button>
            )}

            {/* NoShow — apenas para reuniões */}
            {task.task_type === "meeting" && (
              <button
                onClick={() => actions.handleNoShow(task.id, task.card_id)}
                disabled={isAnyLoading}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-orange-500/50 bg-orange-500/20 px-3 py-1.5 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-400"
              >
                {isLoadingNoShow ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-300/30 border-t-orange-400" />
                ) : (
                  <Users size={14} />
                )}
                NoShow
              </button>
            )}

            {/* Concluir */}
            <Button
              variant="success"
              size="sm"
              onClick={() => actions.handleToggleComplete(task.id)}
              disabled={isAnyLoading}
              loading={isLoadingComplete}
              icon={<Check size={14} />}
              className="h-10"
            >
              Concluir
            </Button>

            {/* Reagendar */}
            <button
              onClick={() => setShowReschedule(true)}
              disabled={isAnyLoading}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-600 transition-colors hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-yellow-400"
            >
              {isLoadingReschedule ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-yellow-300/30 border-t-yellow-400" />
              ) : (
                <Calendar size={14} />
              )}
              Reagendar
            </button>

            {/* Editar */}
            <button
              onClick={() => setShowEdit(true)}
              disabled={isAnyLoading}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
            >
              <Pencil size={14} />
              Editar
            </button>

            {/* Pular */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={isAnyLoading}
              icon={<SkipForward size={14} />}
              className="ml-auto h-10"
            >
              Pular
            </Button>
          </div>
        )}
      </div>

      {/* Modal de seleção de número de telefone */}
      {actions.phoneSelectState && (
        <BaseModal
          isOpen={true}
          onClose={() => actions.setPhoneSelectState(null)}
          title="Selecionar número"
          subtitle={`Para qual número deseja ligar para ${actions.phoneSelectState.person.name}?`}
          size="sm"
        >
          <div className="space-y-2">
            {[
              actions.phoneSelectState.person.phone && {
                label: "Principal",
                number: actions.phoneSelectState.person.phone,
              },
              actions.phoneSelectState.person.phone_whatsapp && {
                label: "WhatsApp",
                number: actions.phoneSelectState.person.phone_whatsapp,
              },
              actions.phoneSelectState.person.phone_commercial && {
                label: "Comercial",
                number: actions.phoneSelectState.person.phone_commercial,
              },
            ]
              .filter(Boolean)
              .map((item) => {
                const { label, number } = item as { label: string; number: string };
                return (
                  <button
                    key={label}
                    onClick={() => {
                      const { taskId, cardId } = actions.phoneSelectState!;
                      actions.setPhoneSelectState(null);
                      actions.executeCall(taskId, number, cardId);
                    }}
                    disabled={actions.loadingStates[actions.phoneSelectState!.taskId] === "call"}
                    className="flex w-full items-center gap-3 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-left transition-colors hover:border-blue-400/60 hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    <Phone size={16} className="flex-shrink-0 text-blue-400" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">{label}</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{number}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </BaseModal>
      )}
    </div>
  );
};

export default FocusModeCard;
