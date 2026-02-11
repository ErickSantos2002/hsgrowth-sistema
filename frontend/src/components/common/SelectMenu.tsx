import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Opção do SelectMenu
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Props do SelectMenu
 */
interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

/**
 * SelectMenu - Dropdown customizado reutilizável
 *
 * Componente de select com dropdown customizado que substitui o select nativo.
 * Oferece melhor controle visual e UX consistente.
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'option1', label: 'Opção 1' },
 *   { value: 'option2', label: 'Opção 2' },
 * ];
 *
 * <SelectMenu
 *   value={selectedValue}
 *   options={options}
 *   onChange={setSelectedValue}
 *   placeholder="Selecione uma opção"
 * />
 * ```
 */
export const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder = "Selecione",
  onChange,
  disabled = false,
  className = "",
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha dropdown ao clicar fora
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

  // Fecha dropdown quando desabilitado
  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  // Fecha dropdown ao pressionar Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Botão do select */}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-slate-600 focus:ring-emerald-500/20"
        } ${
          disabled
            ? "cursor-not-allowed bg-slate-800/50 opacity-60"
            : "bg-slate-800 hover:bg-slate-700"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown de opções */}
      {isOpen && (
        <div
          className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value || option.label}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-slate-800 ${
                  option.value === value ? "bg-slate-800/70 font-medium" : ""
                }`}
                role="option"
                aria-selected={option.value === value}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SelectMenu;
