import React from "react";

/**
 * Props do componente Input
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
}

/**
 * Componente de Input padronizado
 * Segue o padrão visual do sistema com suporte a modo claro e escuro
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, fullWidth = true, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${
          fullWidth ? "w-full" : ""
        } border bg-white px-4 py-3 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
          error
            ? "border-red-500"
            : "border-gray-300 dark:border-slate-600"
        } rounded-lg transition-colors focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
