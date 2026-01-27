import React, { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (value: string) => Promise<void> | void;
  type?: "text" | "number" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  format?: (value: any) => string; // Função para formatar o valor na exibição
}

/**
 * Campo editável com ícone de lápis - Tema escuro
 * Padrão de edição inline usado em toda a página
 */
const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = "text",
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Formata o valor para exibição
  const displayValue = value ? (format ? format(value) : value) : placeholder;

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
            {/* Input de edição */}
            {type === "textarea" ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                rows={3}
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
              />
            )}

            {/* Botões de ação */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Salvar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className={`flex items-center justify-between px-3 py-2 border rounded-lg ${
              disabled
                ? "bg-slate-800/30 border-slate-700 cursor-not-allowed"
                : "bg-slate-900/50 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer"
            } transition-colors`}
          >
            <span className={value ? "text-white" : "text-slate-500 italic"}>
              {displayValue}
            </span>
            {!disabled && (
              <Pencil
                size={14}
                className="text-slate-500 group-hover:text-blue-400 transition-colors"
              />
            )}
            {disabled && (
              <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
                Somente leitura
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableField;
