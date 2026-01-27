import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Save,
  X as XIcon,
} from "lucide-react";
import { Card, List } from "../types";
import { FormField, Input, Select, Textarea, Button, Alert } from "../components/common";
import userService from "../services/userService";
import cardService from "../services/cardService";
import listService from "../services/listService";
import { User as UserType } from "../types";

/**
 * Página de detalhes do Card (estilo Trello)
 * Layout em 2 colunas: Conteúdo principal (esquerda) e Ações (direita)
 */
const CardDetails: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  // Estados principais
  const [card, setCard] = useState<Card | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);

  // Estado de edição
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: undefined as number | undefined,
    due_date: "",
    assigned_to_id: undefined as number | undefined,
    contact_info: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

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
   * Carrega os dados do card e listas do board
   */
  const loadCardData = async () => {
    try {
      setLoading(true);

      // Busca o card
      const cardData = await cardService.getById(Number(cardId));
      setCard(cardData);

      // Busca listas do board do card
      const listsData = await listService.list({ board_id: cardData.board_id });
      setLists(listsData.sort((a, b) => a.position - b.position));

      // Preenche formulário
      resetForm(cardData);
    } catch (error) {
      console.error("Erro ao carregar card:", error);
      alert("Erro ao carregar card");
      navigate(-1); // Volta para página anterior
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carrega lista de usuários para o select
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
   * Reseta o formulário com os dados do card
   */
  const resetForm = (cardData: Card) => {
    // Converte due_date para formato YYYY-MM-DD
    let dueDateFormatted = "";
    if (cardData.due_date) {
      const date = new Date(cardData.due_date);
      dueDateFormatted = date.toISOString().split("T")[0];
    }

    setFormData({
      title: cardData.title,
      description: cardData.description || "",
      value: cardData.value || undefined,
      due_date: dueDateFormatted,
      assigned_to_id: cardData.assigned_to_id || undefined,
      contact_info: {
        name: cardData.contact_info?.name || "",
        email: cardData.contact_info?.email || "",
        phone: cardData.contact_info?.phone || "",
        company: cardData.contact_info?.company || "",
      },
    });
    setIsEditing(false);
  };

  /**
   * Salva as alterações do card
   */
  const handleSave = async () => {
    if (!card) return;

    setIsSaving(true);
    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description || undefined,
        value: formData.value || undefined,
        assigned_to_id: formData.assigned_to_id || undefined,
      };

      // Converte due_date
      if (formData.due_date) {
        const dateStr = formData.due_date.includes("T")
          ? formData.due_date
          : `${formData.due_date}T12:00:00`;
        updateData.due_date = dateStr;
      }

      // Limpa contact_info vazio
      const cleanedContactInfo = Object.fromEntries(
        Object.entries(formData.contact_info || {}).filter(([_, v]) => v)
      );
      if (Object.keys(cleanedContactInfo).length > 0) {
        updateData.contact_info = cleanedContactInfo;
      }

      await cardService.update(card.id, updateData);

      // Recarrega os dados
      await loadCardData();
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar card:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Marca como ganho
   */
  const handleMarkAsWon = async () => {
    if (!card) return;
    if (confirm("Marcar este card como GANHO?")) {
      try {
        await cardService.update(card.id, { is_won: true, is_lost: false });
        await loadCardData();
      } catch (error) {
        console.error("Erro ao marcar como ganho:", error);
        alert("Erro ao marcar card como ganho");
      }
    }
  };

  /**
   * Marca como perdido
   */
  const handleMarkAsLost = async () => {
    if (!card) return;
    if (confirm("Marcar este card como PERDIDO?")) {
      try {
        await cardService.update(card.id, { is_won: false, is_lost: true });
        await loadCardData();
      } catch (error) {
        console.error("Erro ao marcar como perdido:", error);
        alert("Erro ao marcar card como perdido");
      }
    }
  };

  /**
   * Deleta o card
   */
  const handleDelete = async () => {
    if (!card) return;
    if (confirm("Tem certeza que deseja DELETAR este card? Esta ação não pode ser desfeita.")) {
      try {
        await cardService.delete(card.id);
        navigate(`/boards/${card.board_id}`); // Volta para o board
      } catch (error) {
        console.error("Erro ao deletar card:", error);
        alert("Erro ao deletar card");
      }
    }
  };

  /**
   * Move o card para outra lista
   */
  const handleMove = async (targetListId: number) => {
    if (!card) return;
    try {
      await cardService.move(card.id, { target_list_id: targetListId });
      await loadCardData();
    } catch (error) {
      console.error("Erro ao mover card:", error);
      alert("Erro ao mover card");
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

  // Encontra o responsável atual
  const assignedUser = users.find((u) => u.id === card?.assigned_to_id);

  // Formata datas
  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  // Card não encontrado
  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Card não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{card.title}</h1>
                <p className="text-sm text-slate-400 mt-1">
                  na lista <span className="font-medium">{card.list_name || "..."}</span>
                </p>
              </div>
            </div>

            {/* Ações do header */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      resetForm(card);
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                  >
                    <XIcon size={16} />
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    loading={isSaving}
                    icon={<Save size={16} />}
                  >
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status do card (se ganho ou perdido) */}
        {(card.is_won || card.is_lost) && (
          <Alert
            type={card.is_won ? "success" : "error"}
            title={card.is_won ? "Card Ganho!" : "Card Perdido"}
            className="mb-6"
          >
            {card.is_won
              ? `Parabéns! Este card foi marcado como ganho em ${formatDate(card.won_at)}`
              : `Este card foi marcado como perdido em ${formatDate(card.lost_at)}`}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA PRINCIPAL (Esquerda) - 2/3 da largura */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                Descrição
              </h3>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  placeholder="Adicione uma descrição mais detalhada..."
                />
              ) : (
                <div
                  className="min-h-[80px] p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setIsEditing(true)}
                >
                  {card.description || (
                    <span className="text-slate-500 italic">
                      Clique para adicionar uma descrição...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Campos do card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Informações do Card</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Responsável */}
                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      Responsável
                    </span>
                  }
                >
                  {isEditing ? (
                    <Select
                      value={formData.assigned_to_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assigned_to_id: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    >
                      <option value="">Sem responsável</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div
                      className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {assignedUser?.name || <span className="text-slate-500">Não atribuído</span>}
                    </div>
                  )}
                </FormField>

                {/* Data de vencimento */}
                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Data de Vencimento
                    </span>
                  }
                >
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  ) : (
                    <div
                      className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {card.due_date ? formatDate(card.due_date) : (
                        <span className="text-slate-500">Sem data</span>
                      )}
                    </div>
                  )}
                </FormField>

                {/* Valor */}
                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      Valor (R$)
                    </span>
                  }
                >
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.value || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          value: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="0,00"
                    />
                  ) : (
                    <div
                      className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {card.value ? (
                        <span className="font-semibold text-emerald-400">
                          R$ {card.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-500">Sem valor</span>
                      )}
                    </div>
                  )}
                </FormField>
              </div>
            </div>

            {/* Informações de Contato */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">
                Informações de Contato
              </h3>
              <div className="space-y-3">
                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      Nome
                    </span>
                  }
                >
                  {isEditing ? (
                    <Input
                      type="text"
                      value={formData.contact_info?.name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_info: {
                            ...formData.contact_info,
                            name: e.target.value,
                          },
                        })
                      }
                      placeholder="Nome do contato"
                    />
                  ) : (
                    <div
                      className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {card.contact_info?.name || <span className="text-slate-500">-</span>}
                    </div>
                  )}
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    label={
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        Email
                      </span>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.contact_info?.email || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_info: {
                              ...formData.contact_info,
                              email: e.target.value,
                            },
                          })
                        }
                        placeholder="email@exemplo.com"
                      />
                    ) : (
                      <div
                        className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                        onClick={() => setIsEditing(true)}
                      >
                        {card.contact_info?.email || <span className="text-slate-500">-</span>}
                      </div>
                    )}
                  </FormField>

                  <FormField
                    label={
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        Telefone
                      </span>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.contact_info?.phone || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_info: {
                              ...formData.contact_info,
                              phone: e.target.value,
                            },
                          })
                        }
                        placeholder="(00) 00000-0000"
                      />
                    ) : (
                      <div
                        className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                        onClick={() => setIsEditing(true)}
                      >
                        {card.contact_info?.phone || <span className="text-slate-500">-</span>}
                      </div>
                    )}
                  </FormField>
                </div>

                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <Building size={14} />
                      Empresa
                    </span>
                  }
                >
                  {isEditing ? (
                    <Input
                      type="text"
                      value={formData.contact_info?.company || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_info: {
                            ...formData.contact_info,
                            company: e.target.value,
                          },
                        })
                      }
                      placeholder="Nome da empresa"
                    />
                  ) : (
                    <div
                      className="p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {card.contact_info?.company || <span className="text-slate-500">-</span>}
                    </div>
                  )}
                </FormField>
              </div>
            </div>

            {/* Seção de Comentários (Placeholder para futuro) */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Comentários</h3>
              <p className="text-slate-400 text-sm italic">
                Funcionalidade de comentários será implementada em breve...
              </p>
            </div>

            {/* Timeline de Atividades (Placeholder para futuro) */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Atividades</h3>
              <p className="text-slate-400 text-sm italic">
                Timeline de atividades será implementada em breve...
              </p>
            </div>
          </div>

          {/* SIDEBAR (Direita) - 1/3 da largura */}
          <div className="lg:col-span-1 space-y-4">
            {/* Ações */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Ações
              </h3>
              <div className="space-y-2">
                {!card.is_won && !card.is_lost && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      fullWidth
                      icon={<CheckCircle2 size={16} />}
                      onClick={handleMarkAsWon}
                    >
                      Marcar como Ganho
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      icon={<XCircle size={16} />}
                      onClick={handleMarkAsLost}
                    >
                      Marcar como Perdido
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  icon={<Trash2 size={16} />}
                  onClick={handleDelete}
                >
                  Deletar Card
                </Button>
              </div>
            </div>

            {/* Mover para outra lista */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Mover para
              </h3>
              <Select
                value={card.list_id}
                onChange={(e) => handleMove(Number(e.target.value))}
                className="text-sm"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Informações do card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Informações
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Clock size={14} />
                    <span>Criado em:</span>
                  </div>
                  <div className="text-white ml-6">{formatDateTime(card.created_at)}</div>
                </div>

                {card.updated_at && card.updated_at !== card.created_at && (
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock size={14} />
                      <span>Atualizado em:</span>
                    </div>
                    <div className="text-white ml-6">{formatDateTime(card.updated_at)}</div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-700">
                  <div className="text-slate-400 mb-1">ID do Card:</div>
                  <div className="text-white font-mono">#{card.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
