import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Badge } from "../../services/gamificationService";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (badgeData: BadgeFormData) => Promise<void>;
  badge?: Badge | null;
  mode: "create" | "edit";
}

export interface BadgeFormData {
  name: string;
  description: string;
  icon_url: string;
  criteria_type: "automatic" | "manual";
  criteria: Record<string, any>;
}

const BadgeModal: React.FC<BadgeModalProps> = ({ isOpen, onClose, onSave, badge, mode }) => {
  const [formData, setFormData] = useState<BadgeFormData>({
    name: "",
    description: "",
    icon_url: "",
    criteria_type: "manual",
    criteria: {},
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ícones sugeridos para badges
  const suggestedIcons = [
    { emoji: "🏆", label: "Troféu" },
    { emoji: "🥇", label: "Medalha Ouro" },
    { emoji: "🥈", label: "Medalha Prata" },
    { emoji: "🥉", label: "Medalha Bronze" },
    { emoji: "⭐", label: "Estrela" },
    { emoji: "👑", label: "Coroa" },
    { emoji: "🚀", label: "Foguete" },
  ];

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && badge) {
        setFormData({
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url || "",
          criteria_type: badge.criteria_type,
          criteria: badge.criteria || {},
        });
      } else {
        // Reset para modo criação
        setFormData({
          name: "",
          description: "",
          icon_url: "",
          criteria_type: "manual",
          criteria: {},
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, badge]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (formData.name.length < 3 || formData.name.length > 50) {
      newErrors.name = "Nome deve ter entre 3 e 50 caracteres";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    } else if (formData.description.length > 200) {
      newErrors.description = "Descrição deve ter no máximo 200 caracteres";
    }

    // Se for automático, precisa ter critérios definidos
    if (formData.criteria_type === "automatic") {
      if (!formData.criteria.field || !formData.criteria.operator || formData.criteria.value === undefined) {
        newErrors.criteria = "Para badges automáticas, defina o campo, operador e valor";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar badge:", error);
      setErrors({ submit: error.response?.data?.detail || "Erro ao salvar badge" });
    } finally {
      setLoading(false);
    }
  };

  const handleCriteriaChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      criteria: {
        ...formData.criteria,
        [field]: value,
      },
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Criar Nova Badge" : "Editar Badge"}
      subtitle={
        mode === "create"
          ? "Crie uma badge customizada para o sistema"
          : "Edite as informações da badge"
      }
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {mode === "create" ? "Criar Badge" : "Salvar Alterações"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Erro geral */}
          {errors.submit && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-400 font-medium">Erro ao salvar</p>
                <p className="text-red-300 text-sm mt-1">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Nome */}
          <FormField
            label={
              <span>
                Nome da Badge <span className="text-red-400">*</span>
              </span>
            }
            error={errors.name}
          >
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Vendedor Estrela"
              maxLength={50}
              disabled={loading}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            <p className="text-slate-500 text-xs mt-1">{formData.name.length}/50 caracteres</p>
          </FormField>

          {/* Descrição */}
          <FormField
            label={
              <span>
                Descrição <span className="text-red-400">*</span>
              </span>
            }
            error={errors.description}
          >
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Concedida ao vendedor com melhor desempenho do mês"
              maxLength={200}
              rows={3}
              disabled={loading}
            />
            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            <p className="text-slate-500 text-xs mt-1">{formData.description.length}/200 caracteres</p>
          </FormField>

          {/* Ícones sugeridos */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Ícones sugeridos</p>
            <div className="flex flex-wrap justify-center gap-2 md:grid md:grid-cols-7 md:justify-start">
              {suggestedIcons.map((icon) => (
                <button
                  key={icon.emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon_url: icon.emoji })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.icon_url === icon.emoji
                      ? "border-emerald-500 bg-emerald-600/20"
                      : "border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600"
                  }`}
                  title={icon.label}
                  disabled={loading}
                >
                  <span className="text-xl">{icon.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Critério */}
          <FormField
            label={
              <span>
                Tipo de Critério <span className="text-red-400">*</span>
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, criteria_type: "manual" })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.criteria_type === "manual"
                    ? "border-emerald-500 bg-emerald-600/20"
                    : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                }`}
                disabled={loading}
              >
                <p className="font-medium text-white">Manual</p>
                <p className="text-xs text-slate-400 mt-1">Admin atribui manualmente</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, criteria_type: "automatic" })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.criteria_type === "automatic"
                    ? "border-emerald-500 bg-emerald-600/20"
                    : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                }`}
                disabled={loading}
              >
                <p className="font-medium text-white">Automático</p>
                <p className="text-xs text-slate-400 mt-1">Sistema concede por regra</p>
              </button>
            </div>
          </FormField>

          {/* Critérios Automáticos (se selecionado) */}
          {formData.criteria_type === "automatic" && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
              <p className="text-sm font-medium text-slate-300">Regra de Concessão Automática</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Campo */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campo</label>
                  <SelectMenu
                    value={formData.criteria.field || ""}
                    options={[
                      { value: "", label: "Selecione" },
                      { value: "total_points", label: "Total de Pontos" },
                      { value: "rank", label: "Posição no Ranking" },
                      { value: "cards_won", label: "Cards Ganhos" },
                    ]}
                    onChange={(value) => handleCriteriaChange("field", value)}
                  />
                </div>

                {/* Operador */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Operador</label>
                  <SelectMenu
                    value={formData.criteria.operator || ""}
                    options={[
                      { value: "", label: "Selecione" },
                      { value: ">=", label: ">= (maior ou igual)" },
                      { value: ">", label: "> (maior)" },
                      { value: "==", label: "== (igual)" },
                      { value: "<", label: "< (menor)" },
                      { value: "<=", label: "<= (menor ou igual)" },
                    ]}
                    onChange={(value) => handleCriteriaChange("operator", value)}
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor</label>
                  <input
                    type="number"
                    value={formData.criteria.value || ""}
                    onChange={(e) => handleCriteriaChange("value", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: 1000"
                    disabled={loading}
                  />
                </div>
              </div>

              {errors.criteria && <p className="text-red-400 text-sm">{errors.criteria}</p>}

              {/* Exemplo */}
              {formData.criteria.field && formData.criteria.operator && formData.criteria.value !== undefined && (
                <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-xs text-blue-300">
                    <strong>Exemplo:</strong> Badge será concedida automaticamente quando{" "}
                    <strong>
                      {formData.criteria.field === "total_points" && "Total de Pontos"}
                      {formData.criteria.field === "rank" && "Posição no Ranking"}
                      {formData.criteria.field === "cards_won" && "Cards Ganhos"}
                    </strong>{" "}
                    for <strong>{formData.criteria.operator}</strong> <strong>{formData.criteria.value}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

        </form>
    </BaseModal>
  );
};

export default BadgeModal;

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
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
