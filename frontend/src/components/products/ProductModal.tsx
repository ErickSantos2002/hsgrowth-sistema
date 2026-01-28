import React, { useState, useEffect, useRef } from "react";
import { Package, FileText, DollarSign, Tag, ChevronDown } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";
import productService, { Product, CreateProductRequest } from "../../services/productService";

/**
 * Props do componente ProductModal
 */
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product: Product | null; // null = criar, objeto = editar
}

/**
 * Interface para os dados do formulário
 */
interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  unit_price: string; // String para facilitar input, converte depois
  currency: string;
  category: string;
  is_active: boolean;
}

/**
 * Moedas disponíveis
 */
const CURRENCIES = [
  { value: "BRL", label: "BRL - Real Brasileiro" },
  { value: "USD", label: "USD - Dólar Americano" },
  { value: "EUR", label: "EUR - Euro" },
];

/**
 * Modal de Criar/Editar Produto
 *
 * Formulário completo com todos os campos do produto, incluindo:
 * - Dados básicos (nome, descrição, SKU)
 * - Precificação (preço unitário, moeda)
 * - Categorização (categoria)
 * - Status (ativo/inativo)
 */
const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product }) => {
  const isEditing = !!product;

  // Estado do formulário
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    sku: "",
    unit_price: "",
    currency: "BRL",
    category: "",
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Preenche o formulário quando estiver editando
   */
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        sku: product.sku || "",
        unit_price: product.unit_price.toString(),
        currency: product.currency || "BRL",
        category: product.category || "",
        is_active: product.is_active,
      });
    } else {
      // Resetar formulário ao criar novo
      setFormData({
        name: "",
        description: "",
        sku: "",
        unit_price: "",
        currency: "BRL",
        category: "",
        is_active: true,
      });
    }
    setError(null);
  }, [product, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }

    if (!formData.unit_price.trim()) {
      setError("Preço unitário é obrigatório");
      return false;
    }

    const price = parseFloat(formData.unit_price);
    if (isNaN(price) || price < 0) {
      setError("Preço unitário deve ser um número válido e não negativo");
      return false;
    }

    return true;
  };

  /**
   * Salva o produto (criar ou editar)
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      setError(null);

      // Prepara dados para enviar (remove campos vazios)
      const dataToSend: CreateProductRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        unit_price: parseFloat(formData.unit_price),
        currency: formData.currency,
        category: formData.category.trim() || undefined,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await productService.update(product.id, dataToSend);
      } else {
        await productService.create(dataToSend);
      }

      onSave(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      setError(err.response?.data?.detail || "Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para mudança nos campos do formulário
   */
  const handleChange = (field: keyof ProductFormData, value: string | boolean) => {
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
      title={isEditing ? "Editar Produto" : "Novo Produto"}
      subtitle={isEditing ? "Atualize os dados do produto" : "Preencha os dados do novo produto"}
      size="2xl"
      footer={
        <div className="flex justify-between items-center">
          <div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              {isEditing ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Seção: Dados Principais */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-emerald-400" />
            Dados Principais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  Nome *
                </span>
              }
              hint="Nome do produto"
              className="md:col-span-2"
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Notebook Dell Inspiron 15"
                autoFocus
              />
            </FormField>

            {/* SKU */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  SKU
                </span>
              }
              hint="Código único de identificação"
            >
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Ex: NB-DELL-INS15-001"
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
              hint="Categoria do produto"
            >
              <Input
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Ex: Eletrônicos"
              />
            </FormField>

            {/* Descrição */}
            <FormField
              label="Descrição"
              hint="Descrição detalhada do produto"
              className="md:col-span-2"
            >
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descreva as características e detalhes do produto..."
                rows={4}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Precificação */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            Precificação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preço Unitário */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <DollarSign size={14} />
                  Preço Unitário *
                </span>
              }
              hint="Preço de venda do produto"
            >
              <Input
                type="text"
                value={formData.unit_price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
              />
            </FormField>

            {/* Moeda */}
            <FormField
              label="Moeda"
              hint="Moeda de precificação"
            >
              <SelectMenu
                value={formData.currency}
                options={CURRENCIES}
                onChange={(value) => handleChange("currency", value)}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Status */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300 cursor-pointer">
              Produto ativo (desmarque para inativar)
            </label>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ProductModal;

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${
                option.value === value ? "bg-slate-800/70" : ""
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
