import React, { useState, useEffect, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Tag,
  Clock,
  Info,
  Users,
  User,
  Briefcase,
  Target,
  Radio,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  Trash2,
  Download,
  MapPin,
} from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import EditableField from "./EditableField";
import EditableSelectField from "./EditableSelectField";
import { showWarning, showError, showSuccess } from "../../utils/toast";
import { Card, Board } from "../../types";
import { User as UserType } from "../../types";
import userService from "../../services/userService";
import boardService from "../../services/boardService";
import attachmentService, { Attachment } from "../../services/attachmentService";
import {
  DEAL_TYPES,
  ACQUISITION_CHANNELS,
  ACQUISITION_CHANNEL_DETAILS,
  LOSS_REASONS_BY_BOARD_NAME,
  BOOLEAN_OPTIONS,
} from "../../constants/blueprintOptions";

interface SummarySectionProps {
  card: Card;
  onUpdate: (updates: Partial<Card>) => Promise<void>;
  readOnly?: boolean;
}

/**
 * Seção "Resumo" - Informações principais do negócio - Tema escuro
 * Primeira seção da coluna esquerda, expandida por padrão
 * ATUALIZADO: Incluindo campos do blueprint da consultora
 */
const SummarySection: React.FC<SummarySectionProps> = ({ card, onUpdate, readOnly = false }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [sdrUsers, setSDRUsers] = useState<UserType[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);

  // Estado da proposta formal (board 7)
  const [proposalAttachment, setProposalAttachment] = useState<Attachment | null>(null);
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [isDeletingProposal, setIsDeletingProposal] = useState(false);
  const proposalInputRef = useRef<HTMLInputElement>(null);

  // Card está no board de Aquisição (board 7)
  const isAcquisitionBoard = card.board_id === 7;

  // Carrega usuários ativos e SDRs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allUsers, boardsData, sdrs] = await Promise.all([
          userService.listActive(),
          boardService.list({ all: true }),
          userService.listSdrs(),
        ]);

        setUsers(allUsers);
        // Quem pode figurar como SDR: cargo SDR + ex-SDR com card (RN-037)
        setSDRUsers(sdrs);
        setBoards(boardsData.boards);

        // Busca o board atual do card
        if (card.board_id) {
          const board = boardsData.boards.find((b) => b.id === card.board_id);
          setCurrentBoard(board || null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    loadData();
  }, [card.board_id]);

  // Carrega a proposta formal do card (se estiver no board de Aquisição)
  useEffect(() => {
    if (!isAcquisitionBoard) return;

    const loadProposal = async () => {
      try {
        const response = await attachmentService.listFiles(card.id);
        // Busca o anexo mais recente com tipo 'proposal'
        const proposal = response.attachments.find((a) => a.attachment_type === 'proposal') || null;
        setProposalAttachment(proposal);
      } catch (err) {
        console.error("Erro ao carregar proposta:", err);
      }
    };

    loadProposal();
  }, [card.id, isAcquisitionBoard]);

  /**
   * Faz upload da proposta formal (somente PDF)
   */
  const handleProposalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação: somente PDF
    if (file.type !== 'application/pdf') {
      showWarning("Somente arquivos PDF são aceitos para a Proposta Comercial.");
      // Limpa o input para permitir novo upload
      if (proposalInputRef.current) proposalInputRef.current.value = '';
      return;
    }

    // Validação: tamanho máximo 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showWarning("O arquivo é muito grande. Tamanho máximo: 10MB.");
      if (proposalInputRef.current) proposalInputRef.current.value = '';
      return;
    }

    setIsUploadingProposal(true);
    try {
      // Se já existe uma proposta, remove a anterior antes de subir a nova
      if (proposalAttachment) {
        await attachmentService.deleteFile(proposalAttachment.id);
      }

      const uploaded = await attachmentService.uploadFile(card.id, file, 'proposal');
      setProposalAttachment(uploaded);
      showSuccess("Proposta Comercial anexada com sucesso.");
    } catch (err) {
      console.error("Erro ao fazer upload da proposta:", err);
      showError("Erro ao anexar a proposta. Tente novamente.");
    } finally {
      setIsUploadingProposal(false);
      if (proposalInputRef.current) proposalInputRef.current.value = '';
    }
  };

  /**
   * Remove a proposta formal do card
   */
  const handleDeleteProposal = async () => {
    if (!proposalAttachment) return;

    setIsDeletingProposal(true);
    try {
      await attachmentService.deleteFile(proposalAttachment.id);
      setProposalAttachment(null);
      showSuccess("Proposta removida com sucesso.");
    } catch (err) {
      console.error("Erro ao remover proposta:", err);
      showError("Erro ao remover a proposta. Tente novamente.");
    } finally {
      setIsDeletingProposal(false);
    }
  };

  /**
   * Faz download da proposta formal
   */
  const handleDownloadProposal = async () => {
    if (!proposalAttachment) return;
    try {
      await attachmentService.triggerDownload(proposalAttachment.id, proposalAttachment.original_filename);
    } catch (err) {
      showError("Erro ao fazer download da proposta.");
    }
  };

  /**
   * Atualiza a probabilidade
   */
  const handleUpdateProbability = async (value: string) => {
    const probability = parseInt(value);
    if (isNaN(probability) || probability < 0 || probability > 100) {
      showWarning("Probabilidade deve ser entre 0 e 100");
      return;
    }
    await onUpdate({
      contact_info: {
        ...card.contact_info,
        probability: probability,
      },
    });
  };

  /**
   * Atualiza a data esperada de fechamento
   */
  const handleUpdateDueDate = async (value: string) => {
    // Usa meio-dia UTC explícito (Z) para evitar qualquer interpretação de fuso
    const dateStr = value.includes("T") ? value : `${value}T12:00:00Z`;
    await onUpdate({ due_date: dateStr });
  };

  /**
   * Atualiza o custo de frete
   */
  const handleUpdateShippingCost = async (value: string) => {
    const cost = parseFloat(value);
    // Permite zerar o frete (valor 0 é válido)
    const normalized = isNaN(cost) ? undefined : cost < 0 ? 0 : cost;
    await onUpdate({ shipping_cost: normalized });
  };

  /**
   * Atualiza o SDR responsável
   */
  const handleUpdateSDR = async (value: string) => {
    await onUpdate({ sdr_id: value ? parseInt(value) : undefined });
  };

  /**
   * Atualiza tipo de negócio
   */
  const handleUpdateDealType = async (value: string) => {
    await onUpdate({ deal_type: value || undefined });
  };

  /**
   * Atualiza "É venda ou locação?" (obrigatório para marcar como Ganho)
   */
  const handleUpdateModality = async (value: string) => {
    await onUpdate({ modality: value || undefined });
  };

  /**
   * Atualiza canal de aquisição
   */
  const handleUpdateAcquisitionChannel = async (value: string) => {
    // Se mudar o canal, limpa o detalhamento
    await onUpdate({
      acquisition_channel: value || undefined,
      acquisition_channel_detail: undefined,
    });
  };

  /**
   * Atualiza detalhamento do canal de aquisição
   */
  const handleUpdateAcquisitionChannelDetail = async (value: string) => {
    await onUpdate({
      acquisition_channel_detail: value || undefined,
    });
  };

  /**
   * Atualiza parâmetros UTM
   */
  // COMENTADO: Campo UTM não será usado no momento
  // const handleUpdateUTMParams = async (value: string) => {
  //   await cardService.update(card.id, { utm_params: value || undefined });
  //   onUpdate();
  // };

  /**
   * Atualiza a origem do lead (único campo de rastreamento editável pelo frontend)
   */
  const handleUpdateOrigin = async (value: string) => {
    await onUpdate({ origin: value || null });
  };

  /**
   * Atualiza motivo da perda
   */
  const handleUpdateLossReason = async (value: string) => {
    await onUpdate({ loss_reason: value || undefined });
  };

  /**
   * Atualiza campo "Tem Implementação?"
   */
  const handleUpdateHasImplementation = async (value: string) => {
    await onUpdate({
      has_implementation: value === "true" ? true : value === "false" ? false : undefined,
    });
  };

  /**
   * Atualiza campo "Tem Pessoas para Manusear?"
   */
  const handleUpdateHasPersonnel = async (value: string) => {
    await onUpdate({
      has_personnel: value === "true" ? true : value === "false" ? false : undefined,
    });
  };


  /**
   * Formata valor em moeda brasileira
   */
  const formatCurrency = (value: any) => {
    if (!value) return "R$ 0,00";
    const numValue = typeof value === "number" ? value : parseFloat(value);
    return `R$ ${numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Formata data no padrão brasileiro
   */
  const formatDate = (date: string | null) => {
    if (!date) return "";
    // Extrai YYYY-MM-DD e cria data local para evitar que string só de data
    // seja interpretada como UTC meia-noite (causaria -1 dia no Brasil UTC-3)
    const datePart = date.substring(0, 10);
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
  };

  /**
   * Formata data e hora no padrão brasileiro
   */
  const formatDateTime = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString("pt-BR");
  };

  /**
   * Calcula o tempo no funil (idade do card)
   */
  const calculateAge = () => {
    if (!card.created_at) return "0 dias";
    const created = new Date(card.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "1 dia";
    if (diffDays < 7) return `${diffDays} dias`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} semana${weeks > 1 ? "s" : ""}`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} mês${months > 1 ? "es" : ""}`;
  };

  /**
   * Obtém opções de detalhamento baseado no canal selecionado
   */
  const getChannelDetailOptions = () => {
    if (!card.acquisition_channel) return [];
    const details = ACQUISITION_CHANNEL_DETAILS[card.acquisition_channel] || [];
    return details.map((detail) => ({ value: detail, label: detail }));
  };

  /**
   * Obtém opções de motivo da perda baseado no board
   */
  const getLossReasonOptions = () => {
    if (!currentBoard) return [];
    const reasons = LOSS_REASONS_BY_BOARD_NAME[currentBoard.name] || [];
    return reasons.map((reason) => ({ value: reason, label: reason }));
  };

  // Extrai probabilidade do contact_info (temporário até adicionar campo próprio)
  const probability = card.contact_info?.probability || 0;

  // Verifica se o card está perdido
  const isLost = card.is_lost === true;

  // Opções de usuários para dropdowns
  const userOptions = users.map((u) => ({ value: u.id.toString(), label: u.name }));
  const sdrOptions = sdrUsers.map((u) => ({ value: u.id.toString(), label: u.name }));
  const dealTypeOptions = DEAL_TYPES.map((type) => ({ value: type, label: type }));
  const modalityOptions = [
    { value: "venda", label: "Venda" },
    { value: "locacao", label: "Locação" },
  ];
  const channelOptions = ACQUISITION_CHANNELS.map((ch) => ({ value: ch, label: ch }));

  return (
    <ExpandableSection title="Resumo" defaultExpanded={false} icon={<Info size={18} />} readOnly={readOnly}>
      <div className="space-y-6">
        {/* ======== SEÇÃO: VALORES E PREVISÕES ======== */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <DollarSign size={16} />
            Valores e Previsões
          </h4>

          {/* Valor do Negócio - sempre read-only, calculado a partir dos produtos */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <DollarSign size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Valor do negócio</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className={`text-sm font-semibold ${(card.products_total ?? 0) > 0 ? "text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                {formatCurrency(card.products_total ?? 0)}
              </span>
            </div>
            {(card.products_total ?? 0) === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Adicione produtos na seção <strong className="text-slate-400 dark:text-slate-400">Produtos</strong> para calcular o valor automaticamente.
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Calculado automaticamente com base nos produtos vinculados{(card.shipping_cost ?? 0) > 0 ? " + frete" : ""}.
              </p>
            )}
          </div>

          {/* Frete - valor editável que soma ao total */}
          <EditableField
            label="Frete"
            value={card.shipping_cost ?? ""}
            onSave={handleUpdateShippingCost}
            type="number"
            placeholder="R$ 0,00"
            icon={<DollarSign size={14} />}
            format={(val) => formatCurrency(val)}
          />

          {/* Probabilidade de Fechamento */}
          <EditableField
            label="Probabilidade de fechamento"
            value={probability}
            onSave={handleUpdateProbability}
            type="number"
            placeholder="0%"
            icon={<TrendingUp size={14} />}
            format={(val) => `${val}%`}
          />

          {/* Data Esperada de Fechamento */}
          <EditableField
            label="Data esperada de fechamento"
            value={card.due_date ? card.due_date.split("T")[0] : ""}
            onSave={handleUpdateDueDate}
            type="date"
            placeholder="Não definida"
            icon={<Calendar size={14} />}
            format={formatDate}
          />
        </div>

        {/* ======== SEÇÃO: RESPONSÁVEIS ======== */}
        <div className="space-y-4 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Users size={16} />
            Responsáveis
          </h4>

          {/* SDR Responsável (somente leitura — atribuído pelo sistema ou por um Gerente) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <User size={14} className="text-slate-400 dark:text-slate-400" />
              <span>SDR Responsável</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className="text-sm text-slate-900 dark:text-white">
                {card.sdr_name || "Não atribuído"}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              O SDR será atribuído automaticamente pelo sistema ou por um Gerente
            </p>
          </div>

          {/* Vendedor Responsável (campo já existe como assigned_to_id) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Briefcase size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Vendedor Responsável</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className="text-sm text-slate-900 dark:text-white">
                {card.assigned_to_name || "Não atribuído"}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              O vendedor vai ser atribuido automaticamente pelo sistema ou por um Gerente
            </p>
          </div>
        </div>

        {/* ======== SEÇÃO: TRACKING DE BOARDS (READ-ONLY) ======== */}
        <div className="space-y-4 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Target size={16} />
            Tracking de Boards
          </h4>

          {/* Data de Entrada - Prospecção */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Clock size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Data de Entrada - Prospecção</span>
            </div>
            <div className="flex items-center gap-2">
              {card.prospection_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDateTime(card.prospection_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-sm text-slate-400 dark:text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          {/* Data de Entrada - Aquisição */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Clock size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Data de Entrada - Aquisição</span>
            </div>
            <div className="flex items-center gap-2">
              {card.acquisition_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDateTime(card.acquisition_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-sm text-slate-400 dark:text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          {/* Data de Entrada - Expansão */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Clock size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Data de Entrada - Expansão</span>
            </div>
            <div className="flex items-center gap-2">
              {card.expansion_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDateTime(card.expansion_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-sm text-slate-400 dark:text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-2">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-400" />
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Essas datas são preenchidas automaticamente quando o card muda de board.
            </p>
          </div>
        </div>

        {/* ======== SEÇÃO: INFORMAÇÕES DE NEGÓCIO ======== */}
        <div className="space-y-4 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Briefcase size={16} />
            Informações de Negócio
          </h4>

          {/* Tipo de Negócio */}
          <EditableSelectField
            label="Tipo de Negócio"
            value={card.deal_type}
            onSave={handleUpdateDealType}
            options={dealTypeOptions}
            placeholder="Não definido"
            icon={<Tag size={14} />}
          />

          {/* É venda ou locação? (obrigatório para Ganho) */}
          <EditableSelectField
            label="É venda ou locação?"
            value={card.modality}
            onSave={handleUpdateModality}
            options={modalityOptions}
            placeholder="Não definido (obrigatório p/ Ganho)"
            icon={<Tag size={14} />}
          />

          {/* Canal de Aquisição */}
          <EditableSelectField
            label="Canal de Aquisição"
            value={card.acquisition_channel}
            onSave={handleUpdateAcquisitionChannel}
            options={channelOptions}
            placeholder="Não definido"
            icon={<Radio size={14} />}
          />

          {/* Canal de Aquisição - Detalhamento (condicional) */}
          {card.acquisition_channel && (
            <EditableSelectField
              label="Canal de Aquisição - Detalhamento"
              value={card.acquisition_channel_detail}
              onSave={handleUpdateAcquisitionChannelDetail}
              options={getChannelDetailOptions()}
              placeholder="Selecione o detalhamento"
              icon={<Radio size={14} />}
            />
          )}

          {/* Parâmetros UTM - COMENTADO: Não será usado no momento */}
          {/* <EditableField
            label="Parâmetros UTM"
            value={card.utm_params}
            onSave={handleUpdateUTMParams}
            type="text"
            placeholder="Ex: utm_source=google&utm_medium=cpc"
            icon={<LinkIcon size={14} />}
          /> */}

          {/* Tem Implementação? */}
          <EditableSelectField
            label="Tem Implementação?"
            value={
              card.has_implementation === true
                ? "true"
                : card.has_implementation === false
                ? "false"
                : ""
            }
            onSave={handleUpdateHasImplementation}
            options={BOOLEAN_OPTIONS}
            placeholder="Não definido"
            icon={<CheckCircle size={14} />}
          />

          {/* Tem Pessoas para Manusear? */}
          <EditableSelectField
            label="Tem Pessoas para Manusear?"
            value={
              card.has_personnel === true ? "true" : card.has_personnel === false ? "false" : ""
            }
            onSave={handleUpdateHasPersonnel}
            options={BOOLEAN_OPTIONS}
            placeholder="Não definido"
            icon={<Users size={14} />}
          />

        </div>

        {/* ======== SEÇÃO: RASTREAMENTO DE ORIGEM ======== */}
        <div className="space-y-4 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <MapPin size={16} />
            Rastreamento de Origem
          </h4>

          {/* Origem — editável pelo frontend */}
          <EditableField
            label="Origem"
            value={card.origin ?? ""}
            onSave={handleUpdateOrigin}
            type="text"
            placeholder="Ex: Site, Indicação, LinkedIn, Google Ads"
            icon={<MapPin size={14} />}
          />

          {/* UTM Campaign — somente leitura (preenchido via API externa) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <LinkIcon size={14} className="text-slate-400 dark:text-slate-400" />
              <span>UTM Campaign</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className={`text-sm ${card.utm_campaign ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {card.utm_campaign || "Não informado"}
              </span>
            </div>
          </div>

          {/* UTM Source — somente leitura (preenchido via API externa) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <LinkIcon size={14} className="text-slate-400 dark:text-slate-400" />
              <span>UTM Source</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className={`text-sm ${card.utm_source ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {card.utm_source || "Não informado"}
              </span>
            </div>
          </div>

          {/* UTM Term — somente leitura (preenchido via API externa) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <LinkIcon size={14} className="text-slate-400 dark:text-slate-400" />
              <span>UTM Term</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className={`text-sm ${card.utm_term ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {card.utm_term || "Não informado"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-2">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-400" />
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Os campos UTM são preenchidos automaticamente via integração com sistemas externos.
            </p>
          </div>
        </div>

        {/* ======== SEÇÃO: PROPOSTA FORMAL (BOARD DE AQUISIÇÃO) ======== */}
        {isAcquisitionBoard && (
          <div className="space-y-4 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <FileText size={16} />
              Proposta Comercial
            </h4>

            {/* Input oculto para seleção do PDF */}
            <input
              ref={proposalInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleProposalUpload}
            />

            {proposalAttachment ? (
              /* Proposta já anexada */
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-start gap-3">
                  <FileText size={20} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {proposalAttachment.original_filename}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {attachmentService.formatFileSize(proposalAttachment.file_size)}
                      {proposalAttachment.uploader_name && (
                        <> &bull; Enviado por {proposalAttachment.uploader_name}</>
                      )}
                    </p>
                  </div>
                  {/* Ações: download e remover */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={handleDownloadProposal}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="Baixar proposta"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => proposalInputRef.current?.click()}
                      disabled={isUploadingProposal}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="Substituir proposta"
                    >
                      <Upload size={14} />
                    </button>
                    <button
                      onClick={handleDeleteProposal}
                      disabled={isDeletingProposal}
                      className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                      title="Remover proposta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Nenhuma proposta anexada — área de upload */
              <button
                onClick={() => proposalInputRef.current?.click()}
                disabled={isUploadingProposal}
                className="group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 px-4 py-5 text-center transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:cursor-wait"
              >
                {isUploadingProposal ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="text-sm text-slate-400">Enviando proposta...</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-emerald-400 transition-colors">
                        Anexar Proposta Comercial
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Somente PDF &bull; Máximo 10MB
                      </p>
                    </div>
                  </>
                )}
              </button>
            )}

            {/* Aviso sobre obrigatoriedade para avançar de etapa */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400/90">
                A Proposta Comercial em PDF é obrigatória para avançar da etapa
                <strong className="text-amber-400"> Diagnóstico e Proposta</strong> para
                <strong className="text-amber-400"> Negociação</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ======== SEÇÃO: MOTIVO DA PERDA (CONDICIONAL) ======== */}
        {isLost && (
          <div className="space-y-4 border-t border-red-900/30 pt-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertCircle size={16} />
              Motivo da Perda
            </h4>

            <EditableSelectField
              label="Por que o negócio foi perdido?"
              value={card.loss_reason}
              onSave={handleUpdateLossReason}
              options={getLossReasonOptions()}
              placeholder="Selecione o motivo"
              icon={<XCircle size={14} />}
            />

            {!currentBoard && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-700/50 bg-amber-900/10 p-2">
                <Info size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
                <p className="text-xs text-amber-400">
                  Não foi possível identificar o board. As opções podem estar limitadas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======== INFORMAÇÕES SOMENTE LEITURA ======== */}
        <div className="space-y-3 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="text-sm font-semibold text-slate-400 dark:text-slate-400">Informações Gerais</h4>

          {/* Data de Criação */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400 dark:text-slate-400">
              <Clock size={14} />
              <span>Criado em:</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {card.created_at ? formatDate(card.created_at) : "-"}
            </span>
          </div>

          {/* Tempo no Funil */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400 dark:text-slate-400">
              <Clock size={14} />
              <span>Tempo no funil:</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{calculateAge()}</span>
          </div>

          {/* ID do Card */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400 dark:text-slate-400">ID:</span>
            <span className="font-mono text-sm font-medium text-slate-600 dark:text-slate-300">#{card.id}</span>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default SummarySection;
