import React, { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Select } from "../common";

interface EditableSelectFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (value: string) => Promise<void> | void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  format?: (value: any) => string; // Função para formatar o valor na exibição
}

/**
 * Campo editável com dropdown (select) - Tema escuro
 * Similar ao EditableField mas para campos de seleção
 */
const EditableSelectField: React.FC<EditableSelectFieldProps> = ({
  label,
  value,
  onSave,
  options,
  placeholder = "Não informado",
  disabled = false,
  icon,
  format,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza o valor inicial quando o componente monta ou value muda
  useEffect(() => {
    setEditValue(value?.toString() || "");
  }, [value]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || "");
    setIsEditing(false);
  };

  // Formata o valor para exibição
  const displayValue = value
    ? format
      ? format(value)
      : options.find((opt) => opt.value === value?.toString())?.label || value
    : placeholder;

  return (
    <div className="space-y-1">
      {/* Label */}
      <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Campo editável */}
      <div className="relative group">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {/* Select de edição */}
            <Select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              fullWidth
              className="flex-1"
            >
              <option value="">Selecione...</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {/* Botões de ação */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded-lg transition-colors"
            >
              <Check size={16} className="text-white" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className={`px-3 py-2 border rounded-lg transition-colors ${
              disabled
                ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                : "border-slate-700 bg-slate-900/50 cursor-pointer hover:bg-slate-800/50 hover:border-slate-600"
            } flex items-center justify-between`}
          >
            <span className={`text-sm ${value ? "text-white" : "text-slate-500"}`}>
              {displayValue}
            </span>
            {!disabled && (
              <Pencil
                size={14}
                className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableSelectField;
