import React from "react";

/**
 * Props do componente Textarea
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
}

/**
 * Componente de Textarea padronizado
 * Segue o padrão visual do sistema com suporte a modo claro e escuro
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, fullWidth = true, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`${
          fullWidth ? "w-full" : ""
        } border bg-white px-4 py-3 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
          error
            ? "border-red-500"
            : "border-gray-300 dark:border-slate-600"
        } resize-none rounded-lg transition-colors focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
