import React, { useState, useEffect } from "react";
import { DollarSign, Calendar, User, Mail, Phone, Building } from "lucide-react";
import { Card, List } from "../../types";
import { BaseModal, FormField, Input, Select, Textarea, Button, Alert } from "../common";

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
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
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
  const [formData, setFormData] = useState<CardFormData>({
    list_id: currentListId,
    title: "",
    description: "",
    value: undefined,
    due_date: "",
    contact_info: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });
  const [errors, setErrors] = useState<{ title?: string }>({});

  // Resetar form quando abrir/fechar modal ou trocar card
  useEffect(() => {
    if (isOpen) {
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
          contact_info: {
            name: card.contact_info?.name || "",
            email: card.contact_info?.email || "",
            phone: card.contact_info?.phone || "",
            company: card.contact_info?.company || "",
          },
        });
      } else {
        setFormData({
          list_id: currentListId,
          title: "",
          description: "",
          value: undefined,
          due_date: "",
          contact_info: {
            name: "",
            email: "",
            phone: "",
            company: "",
          },
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

    // Limpar campos vazios de contact_info
    const cleanedContactInfo = Object.fromEntries(
      Object.entries(formData.contact_info || {}).filter(([_, v]) => v)
    );

    onSave({
      ...formData,
      title: formData.title.trim(),
      contact_info:
        Object.keys(cleanedContactInfo).length > 0 ? cleanedContactInfo : undefined,
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

        {/* Valor e Data de vencimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Seção de Informações de Contato */}
        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Informações de Contato
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Dados do cliente ou pessoa de contato relacionada a este card
          </p>

          <div className="space-y-4">
            {/* Nome do contato */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Nome do Contato
                </span>
              }
            >
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
                placeholder="João Silva"
              />
            </FormField>

            {/* Email e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    Email
                  </span>
                }
              >
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
                  placeholder="joao@empresa.com"
                />
              </FormField>

              <FormField
                label={
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    Telefone
                  </span>
                }
              >
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
                  placeholder="(11) 98765-4321"
                />
              </FormField>
            </div>

            {/* Empresa */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Building size={14} />
                  Empresa
                </span>
              }
            >
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
                placeholder="Empresa XYZ Ltda"
              />
            </FormField>
          </div>
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
                {formData.contact_info?.name && (
                  <span className="text-slate-400">
                    👤 {formData.contact_info.name}
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
