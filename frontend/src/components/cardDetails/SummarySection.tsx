import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import EditableField from "./EditableField";
import EditableSelectField from "./EditableSelectField";
import { Card, Board } from "../../types";
import { User as UserType } from "../../types";
import cardService from "../../services/cardService";
import userService from "../../services/userService";
import boardService from "../../services/boardService";
import {
  DEAL_TYPES,
  ACQUISITION_CHANNELS,
  ACQUISITION_CHANNEL_DETAILS,
  LOSS_REASONS_BY_BOARD_NAME,
  BOOLEAN_OPTIONS,
} from "../../constants/blueprintOptions";

interface SummarySectionProps {
  card: Card;
  onUpdate: () => void;
  hasProducts?: boolean; // Se true, valor fica read-only
}

/**
 * Seção "Resumo" - Informações principais do negócio - Tema escuro
 * Primeira seção da coluna esquerda, expandida por padrão
 * ATUALIZADO: Incluindo campos do blueprint da consultora
 */
const SummarySection: React.FC<SummarySectionProps> = ({ card, onUpdate, hasProducts = false }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [sdrUsers, setSDRUsers] = useState<UserType[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);

  // Carrega usuários ativos e SDRs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allUsers, boardsData] = await Promise.all([
          userService.listActive(),
          boardService.list({ all: true }),
        ]);

        setUsers(allUsers);
        // Filtra SDRs (assumindo que role seja "sdr" ou similar)
        // Ajustar conforme a estrutura real da role
        const sdrs = allUsers.filter(
          (u) => u.role === "salesperson" || u.role_name?.toLowerCase().includes("sdr")
        );
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

  /**
   * Atualiza o valor do card
   */
  const handleUpdateValue = async (value: string) => {
    const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (isNaN(numericValue)) {
      alert("Valor inválido");
      return;
    }
    await cardService.update(card.id, { value: numericValue });
    onUpdate();
  };

  /**
   * Atualiza a probabilidade
   */
  const handleUpdateProbability = async (value: string) => {
    const probability = parseInt(value);
    if (isNaN(probability) || probability < 0 || probability > 100) {
      alert("Probabilidade deve ser entre 0 e 100");
      return;
    }
    await cardService.update(card.id, {
      contact_info: {
        ...card.contact_info,
        probability: probability,
      },
    });
    onUpdate();
  };

  /**
   * Atualiza a data esperada de fechamento
   */
  const handleUpdateDueDate = async (value: string) => {
    const dateStr = value.includes("T") ? value : `${value}T12:00:00`;
    await cardService.update(card.id, { due_date: dateStr });
    onUpdate();
  };

  /**
   * Atualiza o SDR responsável
   */
  const handleUpdateSDR = async (value: string) => {
    await cardService.update(card.id, { sdr_id: value ? parseInt(value) : undefined });
    onUpdate();
  };

  /**
   * Atualiza tipo de negócio
   */
  const handleUpdateDealType = async (value: string) => {
    await cardService.update(card.id, { deal_type: value || undefined });
    onUpdate();
  };

  /**
   * Atualiza canal de aquisição
   */
  const handleUpdateAcquisitionChannel = async (value: string) => {
    // Se mudar o canal, limpa o detalhamento
    await cardService.update(card.id, {
      acquisition_channel: value || undefined,
      acquisition_channel_detail: undefined,
    });
    onUpdate();
  };

  /**
   * Atualiza detalhamento do canal de aquisição
   */
  const handleUpdateAcquisitionChannelDetail = async (value: string) => {
    await cardService.update(card.id, {
      acquisition_channel_detail: value || undefined,
    });
    onUpdate();
  };

  /**
   * Atualiza parâmetros UTM
   */
  const handleUpdateUTMParams = async (value: string) => {
    await cardService.update(card.id, { utm_params: value || undefined });
    onUpdate();
  };

  /**
   * Atualiza motivo da perda
   */
  const handleUpdateLossReason = async (value: string) => {
    await cardService.update(card.id, { loss_reason: value || undefined });
    onUpdate();
  };

  /**
   * Atualiza campo "Tem Implementação?"
   */
  const handleUpdateHasImplementation = async (value: string) => {
    await cardService.update(card.id, {
      has_implementation: value === "true" ? true : value === "false" ? false : undefined,
    });
    onUpdate();
  };

  /**
   * Atualiza campo "Tem Pessoas para Manusear?"
   */
  const handleUpdateHasPersonnel = async (value: string) => {
    await cardService.update(card.id, {
      has_personnel: value === "true" ? true : value === "false" ? false : undefined,
    });
    onUpdate();
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
    return new Date(date).toLocaleDateString("pt-BR");
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
  const isLost = card.is_lost === true || card.is_won === -1;

  // Opções de usuários para dropdowns
  const userOptions = users.map((u) => ({ value: u.id.toString(), label: u.name }));
  const sdrOptions = sdrUsers.map((u) => ({ value: u.id.toString(), label: u.name }));
  const dealTypeOptions = DEAL_TYPES.map((type) => ({ value: type, label: type }));
  const channelOptions = ACQUISITION_CHANNELS.map((ch) => ({ value: ch, label: ch }));

  return (
    <ExpandableSection title="Resumo" defaultExpanded={false} icon={<Info size={18} />}>
      <div className="space-y-6">
        {/* ======== SEÇÃO: VALORES E PREVISÕES ======== */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <DollarSign size={16} />
            Valores e Previsões
          </h4>

          {/* Valor do Negócio */}
          <EditableField
            label="Valor do negócio"
            value={card.value}
            onSave={handleUpdateValue}
            type="number"
            placeholder="R$ 0,00"
            disabled={hasProducts}
            icon={<DollarSign size={14} />}
            format={formatCurrency}
          />

          {hasProducts && (
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                O valor é calculado automaticamente com base nos produtos cadastrados. Para editar
                manualmente, remova todos os produtos primeiro.
              </p>
            </div>
          )}

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
        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <Users size={16} />
            Responsáveis
          </h4>

          {/* SDR Responsável */}
          <EditableSelectField
            label="SDR Responsável"
            value={card.sdr_id}
            onSave={handleUpdateSDR}
            options={sdrOptions}
            placeholder="Nenhum SDR atribuído"
            icon={<User size={14} />}
          />

          {/* Vendedor Responsável (campo já existe como assigned_to_id) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Briefcase size={14} className="text-slate-400" />
              <span>Vendedor Responsável</span>
            </div>
            <div className="px-3 py-2 border border-slate-700 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-white">
                {card.assigned_to_name || "Não atribuído"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Para alterar o vendedor, use a seção de atribuição ou transferência.
            </p>
          </div>
        </div>

        {/* ======== SEÇÃO: TRACKING DE BOARDS (READ-ONLY) ======== */}
        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <Target size={16} />
            Tracking de Boards
          </h4>

          {/* Data de Entrada - Prospecção */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Clock size={14} className="text-slate-400" />
              <span>Data de Entrada - Prospecção</span>
            </div>
            <div className="flex items-center gap-2">
              {card.prospection_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-300">
                    {formatDateTime(card.prospection_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-500" />
                  <span className="text-sm text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          {/* Data de Entrada - Aquisição */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Clock size={14} className="text-slate-400" />
              <span>Data de Entrada - Aquisição</span>
            </div>
            <div className="flex items-center gap-2">
              {card.acquisition_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-300">
                    {formatDateTime(card.acquisition_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-500" />
                  <span className="text-sm text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          {/* Data de Entrada - Expansão */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Clock size={14} className="text-slate-400" />
              <span>Data de Entrada - Expansão</span>
            </div>
            <div className="flex items-center gap-2">
              {card.expansion_entry_date ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-slate-300">
                    {formatDateTime(card.expansion_entry_date)}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-slate-500" />
                  <span className="text-sm text-slate-500">Não registrado</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 bg-slate-800/30 border border-slate-700/50 rounded-lg">
            <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              Essas datas são preenchidas automaticamente quando o card muda de board.
            </p>
          </div>
        </div>

        {/* ======== SEÇÃO: INFORMAÇÕES DE NEGÓCIO ======== */}
        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
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

          {/* Parâmetros UTM */}
          <EditableField
            label="Parâmetros UTM"
            value={card.utm_params}
            onSave={handleUpdateUTMParams}
            type="text"
            placeholder="Ex: utm_source=google&utm_medium=cpc"
            icon={<LinkIcon size={14} />}
          />

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

        {/* ======== SEÇÃO: MOTIVO DA PERDA (CONDICIONAL) ======== */}
        {isLost && (
          <div className="space-y-4 pt-4 border-t border-red-900/30">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
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
              <div className="flex items-start gap-2 p-2 bg-amber-900/10 border border-amber-700/50 rounded-lg">
                <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  Não foi possível identificar o board. As opções podem estar limitadas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======== INFORMAÇÕES SOMENTE LEITURA ======== */}
        <div className="pt-4 border-t border-slate-700/50 space-y-3">
          <h4 className="text-sm font-semibold text-slate-400">Informações Gerais</h4>

          {/* Data de Criação */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Criado em:</span>
            </div>
            <span className="text-sm font-medium text-white">
              {card.created_at ? formatDate(card.created_at) : "-"}
            </span>
          </div>

          {/* Tempo no Funil */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Tempo no funil:</span>
            </div>
            <span className="text-sm font-medium text-white">{calculateAge()}</span>
          </div>

          {/* ID do Card */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">ID:</span>
            <span className="text-sm font-mono font-medium text-slate-300">#{card.id}</span>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default SummarySection;
