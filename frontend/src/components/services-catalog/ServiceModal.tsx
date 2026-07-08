import React, { useState, useEffect } from "react";
import { Cog, FileText, DollarSign, Tag } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";
import serviceCatalogService, { Service, CreateServiceRequest } from "../../services/serviceCatalogService";

/**
 * Props do componente ServiceModal
 */
interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  service: Service | null; // null = criar, objeto = editar
}

/**
 * Interface para os dados do formulário
 */
interface ServiceFormData {
  name: string;
  description: string;
  sku: string;
  unit_price: string; // String para facilitar input, converte depois
  category: string;
  is_active: boolean;
}

/**
 * Modal de Criar/Editar Serviço
 *
 * Formulário com os campos do serviço:
 * - Dados básicos (nome, descrição, SKU)
 * - Precificação (preço)
 * - Categorização (categoria)
 * - Status (ativo/inativo)
 */
const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, service }) => {
  const isEditing = !!service;

  // Estado do formulário
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    sku: "",
    unit_price: "",
    category: "",
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Preenche o formulário quando estiver editando
   */
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        sku: service.sku || "",
        unit_price: service.unit_price.toString(),
        category: service.category || "",
        is_active: service.is_active,
      });
    } else {
      // Resetar formulário ao criar novo
      setFormData({
        name: "",
        description: "",
        sku: "",
        unit_price: "",
        category: "",
        is_active: true,
      });
    }
    setError(null);
  }, [service, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }

    if (!formData.unit_price.trim()) {
      setError("Preço é obrigatório");
      return false;
    }

    const price = parseFloat(formData.unit_price);
    if (isNaN(price) || price < 0) {
      setError("Preço deve ser um número válido e não negativo");
      return false;
    }

    return true;
  };

  /**
   * Salva o serviço (criar ou editar)
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      setError(null);

      // Prepara dados para enviar (remove campos vazios)
      const dataToSend: CreateServiceRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        unit_price: parseFloat(formData.unit_price),
        category: formData.category.trim() || undefined,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await serviceCatalogService.update(service.id, dataToSend);
      } else {
        await serviceCatalogService.create(dataToSend);
      }

      onSave(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao salvar serviço:", err);
      setError(err.response?.data?.detail || "Erro ao salvar serviço");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para mudança nos campos do formulário
   */
  const handleChange = (field: keyof ServiceFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null); // Limpa erro ao editar
  };

  /**
   * Formata o input de preço para aceitar apenas números e vírgula/ponto
   */
  const handlePriceChange = (value: string) => {
    // Remove tudo exceto números, vírgula e ponto
    const cleaned = value.replace(/[^\d.,]/g, "");
    // Substitui vírgula por ponto
    const normalized = cleaned.replace(",", ".");
    handleChange("unit_price", normalized);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Serviço" : "Novo Serviço"}
      subtitle={isEditing ? "Atualize os dados do serviço" : "Preencha os dados do novo serviço"}
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              {isEditing ? "Salvar Alterações" : "Criar Serviço"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Seção: Dados Principais */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Cog size={20} className="text-emerald-400" />
            Dados Principais
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nome */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Cog size={14} />
                  Nome *
                </span>
              }
              hint="Nome do serviço"
              className="md:col-span-2"
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Calibração de equipamento"
                autoFocus
              />
            </FormField>

            {/* SKU */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  Código/SKU
                </span>
              }
              hint="Código único de identificação"
            >
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Ex: SVC-CAL-001"
              />
            </FormField>

            {/* Categoria */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  Categoria
                </span>
              }
              hint="Categoria do serviço"
            >
              <Input
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Ex: Calibração"
              />
            </FormField>

            {/* Descrição */}
            <FormField
              label="Descrição"
              hint="Descrição detalhada do serviço"
              className="md:col-span-2"
            >
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descreva as características e detalhes do serviço..."
                rows={4}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Precificação */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <DollarSign size={20} className="text-emerald-400" />
            Precificação
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Preço */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <DollarSign size={14} />
                  Preço *
                </span>
              }
              hint="Preço do serviço"
              className="md:col-span-2"
            >
              <Input
                type="text"
                value={formData.unit_price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Status */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Status</h3>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="is_active" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              Serviço ativo (desmarque para inativar)
            </label>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ServiceModal;
