import React, { useState, useEffect } from "react";
import { Calendar, User as UserIcon } from "lucide-react";
import { Card, List } from "../../types";
import { BaseModal, FormField, Input, Select, Textarea, Button, Alert } from "../common";
import userService from "../../services/userService";
import { User as UserType } from "../../types";
import { useAuth } from "../../hooks/useAuth";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (_data: CardFormData) => void;
  card?: Card | null;
  lists: List[];
  currentListId: number;
  title: string;
}

export interface CardFormData {
  list_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  assigned_to_id?: number | null;
  sdr_id?: number | null;
  contact_info?: Record<string, any> | null; // Informações de contato
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
    due_date: "",
    assigned_to_id: undefined,
    sdr_id: undefined,
  });
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [_users, setUsers] = useState<UserType[]>([]);
  const [salespeople, setSalespeople] = useState<UserType[]>([]);
  const [sdrs, setSDRs] = useState<UserType[]>([]);

  // Verifica se o usuário atual é vendedor ou SDR
  const isSalesperson = currentUser?.role?.toLowerCase() === "salesperson";
  const isSDR = currentUser?.role?.toLowerCase() === "sdr";

  // Carregar usuários ativos e filtrar por role
  const loadUsers = async () => {
    try {
      const activeUsers = await userService.listActive();
      setUsers(activeUsers);

      // Filtra vendedores (role = "salesperson")
      const salespeople = activeUsers.filter((u) => u.role === "salesperson");
      setSalespeople(salespeople);

      // Filtra SDRs (role = "sdr")
      const sdrs = activeUsers.filter((u) => u.role === "sdr");
      setSDRs(sdrs);
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
          due_date: dueDateFormatted,
          assigned_to_id: card.assigned_to_id || undefined,
          sdr_id: card.sdr_id || undefined,
        });
      } else {
        // Se for vendedor, já seta automaticamente como responsável
        const defaultAssignedTo = isSalesperson ? currentUser?.id : undefined;

        // Se for SDR, já seta automaticamente como responsável SDR
        const defaultSDR = isSDR ? currentUser?.id : undefined;

        setFormData({
          list_id: currentListId,
          title: "",
          description: "",
          due_date: "",
          assigned_to_id: defaultAssignedTo,
          sdr_id: defaultSDR,
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
        <div className="flex justify-end gap-3">
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
            value={formData.description ?? ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Cliente interessado em nosso serviço premium. Reunião agendada para próxima semana..."
            rows={4}
          />
        </FormField>

        {/* Data e Responsáveis */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              value={formData.due_date ?? ""}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </FormField>

          <FormField
            label={
              <span className="flex items-center gap-1">
                <UserIcon size={14} />
                Responsável SDR
              </span>
            }
            hint={
              isSDR
                ? "Você será automaticamente o responsável SDR"
                : isSalesperson
                ? "Vendedor não pode atribuir SDR"
                : "SDR responsável pela prospecção"
            }
          >
            <Select
              value={formData.sdr_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sdr_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={isSalesperson || isSDR}
            >
              <option value="">Nenhum SDR</option>
              {sdrs.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label={
              <span className="flex items-center gap-1">
                <UserIcon size={14} />
                Responsável Vendedor
              </span>
            }
            hint={
              isSalesperson
                ? "Você será automaticamente o responsável"
                : isSDR
                ? "SDR não pode atribuir vendedor"
                : "Vendedor responsável por este card"
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
              disabled={isSalesperson || isSDR}
            >
              <option value="">Sem vendedor</option>
              {salespeople.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Preview do card (apenas se tiver título) */}
        {formData.title.trim() && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-3 text-xs font-medium text-slate-400">
              Preview do Card:
            </p>
            <div className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-3 backdrop-blur-sm">
              <h4 className="mb-2 text-sm font-medium text-white">
                {formData.title}
              </h4>
              <div className="flex items-center gap-3 text-xs">
                {formData.due_date && (
                  <span className="text-slate-400">
                    📅{" "}
                    {new Date(formData.due_date + "T00:00:00").toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                )}
                {formData.assigned_to_id && (
                  <span className="text-emerald-400">
                    👤 {salespeople.find((u) => u.id === formData.assigned_to_id)?.name}
                  </span>
                )}
                {formData.sdr_id && (
                  <span className="text-amber-400">
                    SDR: {sdrs.find((u) => u.id === formData.sdr_id)?.name}
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
