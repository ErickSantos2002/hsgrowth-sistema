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
 * Segue o padrão visual do sistema
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, fullWidth = true, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${
          fullWidth ? "w-full" : ""
        } px-4 py-3 bg-slate-800 border ${
          error ? "border-red-500" : "border-slate-600"
        } rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
