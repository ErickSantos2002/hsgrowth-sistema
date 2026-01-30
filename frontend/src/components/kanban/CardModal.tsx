import React, { useState, useEffect } from "react";
import { DollarSign, Calendar, User } from "lucide-react";
import { Card, List } from "../../types";
import { BaseModal, FormField, Input, Select, Textarea, Button, Alert } from "../common";
import userService from "../../services/userService";
import { User as UserType } from "../../types";
import { useAuth } from "../../hooks/useAuth";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CardFormData) => void;
  card?: Card | null;
  lists: List[];
  currentListId: number;
  title: string;
}

export interface CardFormData {
  list_id: number;
  title: string;
  description?: string;
  value?: number;
  due_date?: string;
  assigned_to_id?: number;
}

/**
 * Modal para criar ou editar cards (oportunidades/negócios)
 * Permite definir todas as informações do card incluindo contato e valores
 */
const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card,
  lists,
  currentListId,
  title,
}) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<CardFormData>({
    list_id: currentListId,
    title: "",
    description: "",
    value: undefined,
    due_date: "",
    assigned_to_id: undefined,
  });
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [users, setUsers] = useState<UserType[]>([]);

  // Verifica se o usuário atual é vendedor
  const isSalesperson = currentUser?.role?.toLowerCase() === "salesperson";

  // Carregar usuários ativos
  const loadUsers = async () => {
    try {
      const activeUsers = await userService.listActive();
      setUsers(activeUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  // Resetar form quando abrir/fechar modal ou trocar card
  useEffect(() => {
    if (isOpen) {
      loadUsers(); // Carrega lista de usuários

      if (card) {
        // Converter datetime ISO para formato YYYY-MM-DD para o input type="date"
        let dueDateFormatted = "";
        if (card.due_date) {
          const date = new Date(card.due_date);
          dueDateFormatted = date.toISOString().split("T")[0];
        }

        setFormData({
          list_id: card.list_id,
          title: card.title,
          description: card.description || "",
          value: card.value || undefined,
          due_date: dueDateFormatted,
          assigned_to_id: card.assigned_to_id || undefined,
        });
      } else {
        // Se for vendedor, já seta automaticamente como responsável
        const defaultAssignedTo = isSalesperson ? currentUser?.id : undefined;

        setFormData({
          list_id: currentListId,
          title: "",
          description: "",
          value: undefined,
          due_date: "",
          assigned_to_id: defaultAssignedTo,
        });
      }
      setErrors({});
    }
  }, [card, currentListId, isOpen]);

  /**
   * Valida o formulário antes de salvar
   */
  const validateForm = (): boolean => {
    const newErrors: { title?: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = "Título do card é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler do submit do formulário
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      ...formData,
      title: formData.title.trim(),
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={
        card
          ? "Edite as informações do card"
          : "Crie um novo card com todas as informações da oportunidade"
      }
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.title.trim()}
          >
            {card ? "Salvar Alterações" : "Criar Card"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alerta informativo */}
        <Alert type="help">
          <strong>Dica:</strong> Apenas o título é obrigatório. Você pode adicionar mais
          informações posteriormente.
        </Alert>

        {/* Lista de destino */}
        <FormField label="Lista" hint="Selecione em qual lista o card será criado">
          <Select
            value={formData.list_id}
            onChange={(e) =>
              setFormData({ ...formData, list_id: Number(e.target.value) })
            }
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Título do card */}
        <FormField label="Título do Card" required error={errors.title}>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Proposta - Empresa XYZ, Reunião com Cliente..."
            error={!!errors.title}
            autoFocus
          />
        </FormField>

        {/* Descrição */}
        <FormField
          label="Descrição"
          hint="Detalhes sobre a oportunidade, histórico, observações..."
        >
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Cliente interessado em nosso serviço premium. Reunião agendada para próxima semana..."
            rows={4}
          />
        </FormField>

        {/* Valor, Data e Responsável */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label={
              <span className="flex items-center gap-1">
                <DollarSign size={14} />
                Valor (R$)
              </span>
            }
            hint="Valor estimado da oportunidade"
          >
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
          </FormField>

          <FormField
            label={
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Data de Vencimento
              </span>
            }
            hint="Quando esta oportunidade expira"
          >
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </FormField>

          <FormField
            label={
              <span className="flex items-center gap-1">
                <User size={14} />
                Responsável
              </span>
            }
            hint={
              isSalesperson
                ? "Você será automaticamente o responsável"
                : "Quem é o responsável por este card"
            }
          >
            <Select
              value={formData.assigned_to_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  assigned_to_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={isSalesperson}
            >
              <option value="">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Preview do card (apenas se tiver título) */}
        {formData.title.trim() && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-3">
              Preview do Card:
            </p>
            <div className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 p-3 rounded-lg">
              <h4 className="text-white font-medium text-sm mb-2">
                {formData.title}
              </h4>
              <div className="flex items-center gap-3 text-xs">
                {formData.value && (
                  <span className="text-green-400 font-semibold">
                    R$ {formData.value.toLocaleString("pt-BR")}
                  </span>
                )}
                {formData.due_date && (
                  <span className="text-slate-400">
                    📅{" "}
                    {new Date(formData.due_date + "T00:00:00").toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};

export default CardModal;
