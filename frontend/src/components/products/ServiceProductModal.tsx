import React, { useState, useEffect } from "react";
import { Wrench, FileText, Tag } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";
import serviceProductService, {
  ServiceProduct,
  ServiceProductCreate,
} from "../../services/serviceProductService";

interface ServiceProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product: ServiceProduct | null; // null = criar, objeto = editar
}

interface FormData {
  name: string;
  sku: string;
  category: string;
  description: string;
  is_active: boolean;
}

/**
 * Modal de Criar/Editar Equipamento de Serviço.
 *
 * Espelha o ProductModal (catálogo de Vendas), MAS sem preço/moeda: em Serviços o
 * valor do negócio vem dos serviços do card, não do equipamento (ver
 * `app/models/service_product.py`).
 */
const ServiceProductModal: React.FC<ServiceProductModalProps> = ({ isOpen, onClose, onSave, product }) => {
  const isEditing = !!product;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    sku: "",
    category: "",
    description: "",
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        description: product.description || "",
        is_active: product.is_active,
      });
    } else {
      setFormData({ name: "", sku: "", category: "", description: "", is_active: true });
    }
    setError(null);
  }, [product, isOpen]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const dataToSend: ServiceProductCreate = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
      };
      if (isEditing) {
        await serviceProductService.update(product.id, dataToSend);
      } else {
        await serviceProductService.create(dataToSend);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar equipamento:", err);
      setError(err.response?.data?.detail || "Erro ao salvar equipamento");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Equipamento" : "Novo Equipamento de Serviço"}
      subtitle={isEditing ? "Atualize os dados do equipamento" : "Cadastre um equipamento do catálogo de Serviços"}
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div>{error && <p className="text-sm text-red-400">{error}</p>}</div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              {isEditing ? "Salvar Alterações" : "Criar Equipamento"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Wrench size={20} className="text-sky-400" />
            Dados do Equipamento
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Wrench size={14} />
                  Nome *
                </span>
              }
              hint="Nome/modelo do equipamento"
              className="md:col-span-2"
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Bafômetro Mark X - Plus"
                autoFocus
              />
            </FormField>

            <FormField
              label={
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  SKU
                </span>
              }
              hint="Código do equipamento (opcional)"
            >
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Ex: BAF-MARKX-PLUS"
              />
            </FormField>

            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  Categoria
                </span>
              }
              hint="Categoria do equipamento"
            >
              <Input
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Ex: Equipamento GestorHS"
              />
            </FormField>

            <FormField label="Descrição" hint="Detalhes do equipamento" className="md:col-span-2">
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descreva o equipamento..."
                rows={4}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Status</h3>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sp_is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="sp_is_active" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              Equipamento ativo (desmarque para inativar)
            </label>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ServiceProductModal;
