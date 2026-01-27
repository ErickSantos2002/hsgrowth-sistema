import React, { useState, useEffect } from "react";
import { X, Award, AlertCircle } from "lucide-react";
import { Badge } from "../../services/gamificationService";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <Award className="text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === "create" ? "Criar Nova Badge" : "Editar Badge"}
              </h2>
              <p className="text-sm text-slate-400">
                {mode === "create"
                  ? "Crie uma badge customizada para o sistema"
                  : "Edite as informações da badge"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome da Badge <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 bg-slate-900 border ${
                errors.name ? "border-red-500" : "border-slate-700"
              } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              placeholder="Ex: Vendedor Estrela"
              maxLength={50}
              disabled={loading}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            <p className="text-slate-500 text-xs mt-1">{formData.name.length}/50 caracteres</p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-2 bg-slate-900 border ${
                errors.description ? "border-red-500" : "border-slate-700"
              } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]`}
              placeholder="Ex: Concedida ao vendedor com melhor desempenho do mês"
              maxLength={200}
              disabled={loading}
            />
            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            <p className="text-slate-500 text-xs mt-1">{formData.description.length}/200 caracteres</p>
          </div>

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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Critério <span className="text-red-400">*</span>
            </label>
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
          </div>

          {/* Critérios Automáticos (se selecionado) */}
          {formData.criteria_type === "automatic" && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
              <p className="text-sm font-medium text-slate-300">Regra de Concessão Automática</p>

              <div className="grid grid-cols-3 gap-3">
                {/* Campo */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campo</label>
                  <select
                    value={formData.criteria.field || ""}
                    onChange={(e) => handleCriteriaChange("field", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    <option value="total_points">Total de Pontos</option>
                    <option value="rank">Posição no Ranking</option>
                    <option value="cards_won">Cards Ganhos</option>
                  </select>
                </div>

                {/* Operador */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Operador</label>
                  <select
                    value={formData.criteria.operator || ""}
                    onChange={(e) => handleCriteriaChange("operator", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    <option value=">=">&gt;= (maior ou igual)</option>
                    <option value=">">&gt; (maior)</option>
                    <option value="==">== (igual)</option>
                    <option value="<">&lt; (menor)</option>
                    <option value="<=">&lt;= (menor ou igual)</option>
                  </select>
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

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Salvando..." : mode === "create" ? "Criar Badge" : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BadgeModal;
