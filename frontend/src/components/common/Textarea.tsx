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
 * Segue o padrão visual do sistema
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, fullWidth = true, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`${
          fullWidth ? "w-full" : ""
        } border bg-slate-800 px-4 py-3 ${
          error ? "border-red-500" : "border-slate-600"
        } resize-none rounded-lg text-white placeholder-slate-400 transition-colors focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
