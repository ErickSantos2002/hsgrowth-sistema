import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, ChevronDown } from "lucide-react";
import { showError } from "../../utils/toast";

interface EditableSelectFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (_value: string) => Promise<void> | void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  format?: (_value: any) => string; // Função para formatar o valor na exibição
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
      showError("Erro ao salvar alterações");
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
      <div className="group relative">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {/* Select de edição */}
            <div className="flex-1">
              <SelectMenu
                value={editValue}
                options={[{ value: "", label: "Selecione..." }, ...options]}
                onChange={setEditValue}
              />
            </div>

            {/* Botões de ação */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-emerald-600 p-2 transition-colors hover:bg-emerald-700 disabled:bg-slate-700"
            >
              <Check size={16} className="text-white" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg bg-slate-700 p-2 transition-colors hover:bg-slate-600 disabled:bg-slate-800"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className={`rounded-lg border px-3 py-2 transition-colors ${
              disabled
                ? "cursor-not-allowed border-slate-800 bg-slate-900/30"
                : "cursor-pointer border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50"
            } flex items-center justify-between`}
          >
            <span className={`text-sm ${value ? "text-white" : "text-slate-500"}`}>
              {displayValue}
            </span>
            {!disabled && (
              <Pencil
                size={14}
                className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableSelectField;

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
  disabled?: boolean;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}) => {
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

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
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
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
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
