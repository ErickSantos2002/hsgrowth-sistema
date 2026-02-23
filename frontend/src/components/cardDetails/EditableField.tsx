import React, { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { showError } from "../../utils/toast";

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (_value: string) => Promise<void> | void;
  type?: "text" | "number" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  format?: (_value: any) => string; // Função para formatar o valor na exibição
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
      showError("Erro ao salvar alterações");
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
      <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        {icon && <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Campo editável */}
      <div className="group relative">
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
                className="flex-1 rounded-lg border border-blue-500 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 rounded-lg border border-blue-500 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Botões de ação */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              title="Salvar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg bg-gray-200 dark:bg-slate-700 p-2 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-600"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              disabled
                ? "cursor-not-allowed border-gray-200 dark:border-slate-700 bg-gray-100/30 dark:bg-slate-800/30"
                : "cursor-pointer border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:border-blue-500/50 hover:bg-gray-100 dark:hover:bg-slate-800/50"
            } transition-colors`}
          >
            <span className={value ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}>
              {displayValue}
            </span>
            {!disabled && (
              <Pencil
                size={14}
                className="text-slate-400 dark:text-slate-500 transition-colors group-hover:text-blue-400"
              />
            )}
            {disabled && (
              <span className="rounded border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400 dark:text-slate-500">
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
