import React from "react";

/**
 * Props do componente Select
 */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  fullWidth?: boolean;
  options?: Array<{ value: string | number; label: string }>;
}

/**
 * Componente de Select padronizado
 * Segue o padrão visual do sistema
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { error = false, fullWidth = true, options, className = "", children, ...props },
    ref
  ) => {
    return (
      <select
        ref={ref}
        className={`${
          fullWidth ? "w-full" : ""
        } border bg-slate-800 px-4 py-3 ${
          error ? "border-red-500" : "border-slate-600"
        } rounded-lg text-white transition-colors focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${className}`}
        {...props}
      >
        {children}
        {options &&
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    );
  }
);

Select.displayName = "Select";

export default Select;
