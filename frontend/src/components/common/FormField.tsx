import React from "react";

/**
 * Props do componente FormField
 */
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente wrapper para campos de formulário
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
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

export default FormField;
