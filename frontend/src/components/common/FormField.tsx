import React from "react";

/**
 * Props do componente FormField
 */
interface FormFieldProps {
  label: string | React.ReactNode; // Aceita string ou JSX elements (com ícones, etc)
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente wrapper para campos de formulário com suporte a modo claro e escuro
 * Padroniza label, mensagem de erro e hint
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  className = "",
}) => {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
};

export default FormField;
