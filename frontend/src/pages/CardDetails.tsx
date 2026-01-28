import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Calendar,
  FileText,
  Paperclip,
  Users,
} from "lucide-react";
import { Card } from "../types";
import cardService from "../services/cardService";
import userService from "../services/userService";
import { User as UserType } from "../types";
import { useAuth } from "../context/AuthContext";
import { SummarySection, ClientSection, ContactSection, CustomFieldsSection, ProductSection, QuickActivityForm, FocusSection, HistorySection } from "../components/cardDetails";
import PipelineStages from "../components/cardDetails/PipelineStages";
import NotesSection from "../components/cardDetails/NotesSection";
import SchedulerSection from "../components/cardDetails/SchedulerSection";
import FilesSection from "../components/cardDetails/FilesSection";

/**
 * Página de detalhes do Card - Layout estilo Pipedrive com tema escuro
 * Layout: 30% (informações) + 70% (atividades/histórico)
 */
const CardDetails: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Estados principais
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isMovingCard, setIsMovingCard] = useState(false);

  // Estado das abas
  const [activeTab, setActiveTab] = useState<"atividade" | "anotacoes" | "agendador" | "arquivos">("atividade");

  /**
   * Carrega dados do card ao montar o componente
   */
  useEffect(() => {
    if (cardId) {
      loadCardData();
      loadUsers();
    }
  }, [cardId]);

  /**
   * Carrega os dados do card com todos os relacionamentos
   */
  const loadCardData = async () => {
    try {
      setLoading(true);
      const cardData = await cardService.getExpanded(Number(cardId));
      setCard(cardData);
      setTitleValue(cardData.title);
    } catch (error) {
      console.error("Erro ao carregar card:", error);
      alert("Erro ao carregar card");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carrega lista de usuários
   */
  const loadUsers = async () => {
    try {
      const activeUsers = await userService.listActive();
      setUsers(activeUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  /**
   * Salva o título do card
   */
  const handleSaveTitle = async () => {
    if (!card || !titleValue.trim()) return;

    try {
      await cardService.update(card.id, { title: titleValue });
      await loadCardData();
      setIsTitleEditing(false);
    } catch (error) {
      console.error("Erro ao salvar título:", error);
      alert("Erro ao salvar título");
    }
  };

  /**
   * Marca como ganho
   */
  const handleMarkAsWon = async () => {
    if (!card) return;
    if (confirm("Marcar este negócio como GANHO?")) {
      try {
        await cardService.update(card.id, { is_won: true, is_lost: false });
        await loadCardData();
      } catch (error) {
        console.error("Erro ao marcar como ganho:", error);
        alert("Erro ao marcar negócio como ganho");
      }
    }
  };

  /**
   * Marca como perdido
   */
  const handleMarkAsLost = async () => {
    if (!card) return;
    const motivo = prompt("Por que este negócio foi perdido?");
    if (motivo !== null) {
      try {
        await cardService.update(card.id, { is_won: false, is_lost: true });
        await loadCardData();
      } catch (error) {
        console.error("Erro ao marcar como perdido:", error);
        alert("Erro ao marcar negócio como perdido");
      }
    }
  };

  /**
   * Volta para o board
   */
  const handleBack = () => {
    if (card) {
      navigate(`/boards/${card.board_id}`);
    } else {
      navigate(-1);
    }
  };

  /**
   * Atualiza o responsável do card
   */
  const handleChangeAssignee = async (userId: number) => {
    if (!card) return;

    try {
      await cardService.update(card.id, { assigned_to_id: userId });
      await loadCardData();
      setShowAssigneeDropdown(false);
    } catch (error) {
      console.error("Erro ao atualizar responsável:", error);
      alert("Erro ao atualizar responsável");
    }
  };

  /**
   * Move o card para outra lista
   */
  const handleMoveCard = async (newListId: number) => {
    if (!card || isMovingCard) return;

    try {
      setIsMovingCard(true);

      // Usa o endpoint /move com target_list_id
      await cardService.move(card.id, {
        target_list_id: newListId,
        position: 0, // Adiciona no topo da nova lista
      });

      await loadCardData();
    } catch (error) {
      console.error("Erro ao mover card:", error);
      alert("Erro ao mover card para nova lista");
    } finally {
      setIsMovingCard(false);
    }
  };

  // Verifica se o usuário pode alterar o responsável
  const canChangeAssignee = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Encontra o responsável atual
  const assignedUser = users.find((u) => u.id === card?.assigned_to_id);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  // Card não encontrado
  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Negócio não encontrado</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* ========== HEADER FIXO ========== */}
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Lado Esquerdo: Botão Voltar + Título */}
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-800/80 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Voltar ao board"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Título Editável */}
              {isTitleEditing ? (
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setTitleValue(card.title);
                      setIsTitleEditing(false);
                    }
                  }}
                  autoFocus
                  className="text-2xl font-semibold text-white bg-slate-800/50 border-b-2 border-blue-500 focus:outline-none px-2 py-1 rounded"
                />
              ) : (
                <h1
                  onClick={() => setIsTitleEditing(true)}
                  className="text-2xl font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                  title="Clique para editar"
                >
                  {card.title}
                </h1>
              )}
            </div>

            {/* Lado Direito: Avatar + Botões de Ação */}
            <div className="flex items-center gap-3">
              {/* Avatar do Responsável com Dropdown (apenas para admin/manager) */}
              <div className="relative">
                {canChangeAssignee ? (
                  // Admin/Manager - com dropdown
                  <>
                    <button
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 cursor-pointer transition-colors border border-slate-700/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                        {assignedUser?.name?.substring(0, 2).toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-medium text-white">{assignedUser?.name || "Não atribuído"}</span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {/* Dropdown de seleção de responsável */}
                    {showAssigneeDropdown && (
                      <>
                        {/* Overlay para fechar ao clicar fora */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowAssigneeDropdown(false)}
                        />

                        {/* Menu dropdown */}
                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                          <div className="p-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1 mb-1">
                              Selecionar responsável
                            </p>
                            {users.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleChangeAssignee(user.id)}
                                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left ${
                                  user.id === card?.assigned_to_id
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "hover:bg-slate-700 text-slate-300"
                                }`}
                              >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-xs">
                                  {user.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{user.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{user.role_name}</p>
                                </div>
                                {user.id === card?.assigned_to_id && (
                                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Vendedor - apenas visualização (sem seta)
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                      {assignedUser?.name?.substring(0, 2).toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-medium text-white">{assignedUser?.name || "Não atribuído"}</span>
                  </div>
                )}
              </div>

              {/* Botão Ganho */}
              {!card.is_won && !card.is_lost && (
                <button
                  onClick={handleMarkAsWon}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Ganho
                </button>
              )}

              {/* Botão Perdido */}
              {!card.is_won && !card.is_lost && (
                <button
                  onClick={handleMarkAsLost}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                  <XCircle size={18} />
                  Perdido
                </button>
              )}

              {/* Se já foi ganho ou perdido */}
              {card.is_won && (
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg font-medium flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Negócio Ganho
                </div>
              )}
              {card.is_lost && (
                <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-medium flex items-center gap-2">
                  <XCircle size={18} />
                  Negócio Perdido
                </div>
              )}
            </div>
          </div>

          {/* Pipeline de Stages */}
          {card.board_id && (
            <div className="mt-3">
              <PipelineStages
                boardId={card.board_id}
                currentListId={card.list_id}
                onMoveCard={handleMoveCard}
                isMoving={isMovingCard}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========== LAYOUT PRINCIPAL: 30% + 70% (COM SCROLL INDEPENDENTE) ========== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ========== COLUNA ESQUERDA: 30% - INFORMAÇÕES (SCROLL INDEPENDENTE) ========== */}
        <div className="w-[30%] border-r border-slate-700/50 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="p-6 space-y-4 min-h-full">
            {/* Seção: Resumo */}
            <SummarySection
              card={card}
              onUpdate={loadCardData}
              hasProducts={((card as any).products?.length || 0) > 0}
            />

            {/* Seção: Cliente (Organização) */}
            <ClientSection card={card} onUpdate={loadCardData} />

            {/* Seção: Informação de Contato (Pessoa) */}
            <ContactSection card={card} onUpdate={loadCardData} />

            {/* Seção: Campos Personalizados */}
            <CustomFieldsSection card={card} onUpdate={loadCardData} />

            {/* Seção: Produto (mockada) */}
            <ProductSection card={card} onUpdate={loadCardData} />
          </div>
        </div>

        {/* ========== COLUNA DIREITA: 70% - ATIVIDADES E HISTÓRICO (SCROLL INDEPENDENTE) ========== */}
        <div className="w-[70%] overflow-y-auto overflow-x-hidden min-h-0">
          <div className="p-6 min-h-full">
            {/* Sistema de Abas */}
            <div className="border-b border-slate-700/50 mb-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab("atividade")}
                  className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "atividade"
                      ? "border-blue-500 text-blue-400 font-medium"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Calendar size={18} />
                  Atividade
                  <span className="ml-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium border border-blue-500/30">
                    {card.pending_tasks?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("anotacoes")}
                  className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "anotacoes"
                      ? "border-blue-500 text-blue-400 font-medium"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText size={18} />
                  Anotações
                  <span className="ml-1 px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded-full font-medium border border-slate-700">
                    {card.notes?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("agendador")}
                  className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "agendador"
                      ? "border-blue-500 text-blue-400 font-medium"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Users size={18} />
                  Agendador de reuniões
                </button>

                <button
                  onClick={() => setActiveTab("arquivos")}
                  className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "arquivos"
                      ? "border-blue-500 text-blue-400 font-medium"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Paperclip size={18} />
                  Arquivos
                  <span className="ml-1 px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded-full font-medium border border-slate-700">
                    0
                  </span>
                </button>
              </div>
            </div>

            {/* Conteúdo da aba ativa */}
            <div className="space-y-6">
              {activeTab === "atividade" && (
                <>
                  {/* Área de Criação Rápida */}
                  <QuickActivityForm
                    cardId={card.id}
                    onSave={loadCardData}
                    onCancel={() => {}}
                  />

                  {/* Seção Foco - Tarefas Pendentes */}
                  <FocusSection tasks={card.pending_tasks || []} onUpdate={loadCardData} />

                  {/* Seção Histórico */}
                  <HistorySection activities={card.recent_activities || []} />
                </>
              )}

              {activeTab === "anotacoes" && (
                <NotesSection
                  cardId={card.id}
                  notes={card.notes || []}
                  onUpdate={loadCardData}
                />
              )}

              {activeTab === "agendador" && <SchedulerSection />}

              {activeTab === "arquivos" && <FilesSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
