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
  /**
   * Tamanho do botão: "md" (padrão, px-4 py-3) ou "sm" (compacto, px-3 py-2 text-sm).
   * Use "sm" em barras de filtro para economizar espaço horizontal.
   */
  size?: "md" | "sm";
}

/**
 * SelectMenu - Dropdown customizado reutilizável com suporte a modo claro e escuro
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
  size = "md",
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

  // Classes do botão variando por tamanho
  const sizeClasses =
    size === "sm"
      ? "px-3 py-2 text-sm gap-2"
      : "px-4 py-3 gap-3";

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
        className={`flex w-full items-center justify-between rounded-lg border text-slate-900 transition-colors focus:outline-none focus:ring-2 dark:text-white ${sizeClasses} ${
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:ring-emerald-500/20 dark:border-slate-600"
        } ${
          disabled
            ? "cursor-not-allowed bg-gray-100/50 opacity-60 dark:bg-slate-800/50"
            : "bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown de opções */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-400">
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
                className={`w-full px-4 py-2 text-left text-sm text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                  option.value === value
                    ? "bg-gray-100 font-medium dark:bg-slate-800/70"
                    : ""
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
