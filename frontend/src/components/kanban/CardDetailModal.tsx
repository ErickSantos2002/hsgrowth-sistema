import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Card, List } from "../../types";
import { BaseModal, FormField, Input, Select, Textarea, Button, Alert } from "../common";
import userService from "../../services/userService";
import { User as UserType } from "../../types";

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  lists: List[];
  onUpdate: (cardId: number, data: Partial<Card>) => Promise<void>;
  onDelete: (cardId: number) => Promise<void>;
  onMarkAsWon: (cardId: number) => Promise<void>;
  onMarkAsLost: (cardId: number) => Promise<void>;
  onMove: (cardId: number, targetListId: number) => Promise<void>;
}

/**
 * Modal detalhada do Card (estilo Trello)
 * Layout em 2 colunas: Conteúdo principal (esquerda) e Ações (direita)
 */
const CardDetailModal: React.FC<CardDetailModalProps> = ({
  isOpen,
  onClose,
  card,
  lists,
  onUpdate,
  onDelete,
  onMarkAsWon,
  onMarkAsLost,
  onMove,
}) => {
  // Estado do formulário (editável)
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || "",
    value: card.value || undefined,
    due_date: "",
    assigned_to_id: card.assigned_to_id || undefined,
    contact_info: {
      name: card.contact_info?.name || "",
      email: card.contact_info?.email || "",
      phone: card.contact_info?.phone || "",
      company: card.contact_info?.company || "",
    },
  });

  // Carrega usuários ativos ao abrir modal
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      resetForm();
    }
  }, [isOpen, card]);

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
  const resetForm = () => {
    // Converte due_date para formato YYYY-MM-DD
    let dueDateFormatted = "";
    if (card.due_date) {
      const date = new Date(card.due_date);
      dueDateFormatted = date.toISOString().split("T")[0];
    }

    setFormData({
      title: card.title,
      description: card.description || "",
      value: card.value || undefined,
      due_date: dueDateFormatted,
      assigned_to_id: card.assigned_to_id || undefined,
      contact_info: {
        name: card.contact_info?.name || "",
        email: card.contact_info?.email || "",
        phone: card.contact_info?.phone || "",
        company: card.contact_info?.company || "",
      },
    });
    setIsEditing(false);
  };

  /**
   * Salva as alterações do card
   */
  const handleSave = async () => {
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

      await onUpdate(card.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar card:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para marcar como ganho
   */
  const handleMarkAsWon = async () => {
    if (confirm("Marcar este card como GANHO?")) {
      try {
        await onMarkAsWon(card.id);
        onClose();
      } catch (error) {
        console.error("Erro ao marcar como ganho:", error);
        alert("Erro ao marcar card como ganho");
      }
    }
  };

  /**
   * Handler para marcar como perdido
   */
  const handleMarkAsLost = async () => {
    if (confirm("Marcar este card como PERDIDO?")) {
      try {
        await onMarkAsLost(card.id);
        onClose();
      } catch (error) {
        console.error("Erro ao marcar como perdido:", error);
        alert("Erro ao marcar card como perdido");
      }
    }
  };

  /**
   * Handler para deletar card
   */
  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja DELETAR este card? Esta ação não pode ser desfeita.")) {
      try {
        await onDelete(card.id);
        onClose();
      } catch (error) {
        console.error("Erro ao deletar card:", error);
        alert("Erro ao deletar card");
      }
    }
  };

  /**
   * Handler para mover card
   */
  const handleMove = async (targetListId: number) => {
    try {
      await onMove(card.id, targetListId);
    } catch (error) {
      console.error("Erro ao mover card:", error);
      alert("Erro ao mover card");
    }
  };

  // Encontra o responsável atual
  const assignedUser = users.find((u) => u.id === card.assigned_to_id);

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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="2xl"
      showCloseButton={false}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUNA PRINCIPAL (Esquerda) - 2/3 da largura */}
        <div className="md:col-span-2 space-y-6">
          {/* Cabeçalho com título */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-2xl font-bold text-white cursor-pointer hover:bg-slate-700/30 rounded px-2 py-1 -mx-2"
                  onClick={() => setIsEditing(true)}
                >
                  {card.title}
                </h2>
              )}
              <p className="text-sm text-slate-400 mt-1">
                na lista <span className="font-medium">{card.list_name || "..."}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status do card (se ganho ou perdido) */}
          {(card.is_won || card.is_lost) && (
            <Alert
              type={card.is_won ? "success" : "error"}
              title={card.is_won ? "Card Ganho!" : "Card Perdido"}
            >
              {card.is_won
                ? `Parabéns! Este card foi marcado como ganho em ${formatDate(card.won_at)}`
                : `Este card foi marcado como perdido em ${formatDate(card.lost_at)}`}
            </Alert>
          )}

          {/* Descrição */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
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
                className="min-h-[80px] p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 cursor-pointer hover:bg-slate-700/30 transition-colors"
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
                  className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                  className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                  className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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

          {/* Informações de Contato */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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
                    className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                      className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                      className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                    className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setIsEditing(true)}
                  >
                    {card.contact_info?.company || <span className="text-slate-500">-</span>}
                  </div>
                )}
              </FormField>
            </div>
          </div>

          {/* Botões de salvar/cancelar quando está editando */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <Button variant="secondary" onClick={resetForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>

        {/* SIDEBAR (Direita) - 1/3 da largura */}
        <div className="md:col-span-1 space-y-4">
          {/* Ações */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Ações
            </h3>

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

          {/* Mover para outra lista */}
          <div className="space-y-2">
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
          <div className="space-y-3 pt-4 border-t border-slate-700">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Informações
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span>Criado em:</span>
              </div>
              <div className="text-white ml-6">{formatDateTime(card.created_at)}</div>

              {card.updated_at && card.updated_at !== card.created_at && (
                <>
                  <div className="flex items-center gap-2 text-slate-400 mt-3">
                    <Clock size={14} />
                    <span>Atualizado em:</span>
                  </div>
                  <div className="text-white ml-6">{formatDateTime(card.updated_at)}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default CardDetailModal;
