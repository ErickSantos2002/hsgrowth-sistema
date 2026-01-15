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
        } px-4 py-3 bg-slate-800 border ${
          error ? "border-red-500" : "border-slate-600"
        } rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-colors ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
