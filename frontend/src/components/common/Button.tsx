import React from "react";

/**
 * Variantes de estilo do botão
 */
type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

/**
 * Tamanhos do botão
 */
type ButtonSize = "sm" | "md" | "lg";

/**
 * Props do componente Button
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Mapa de classes CSS para cada variante (suporte a modo claro e escuro)
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "bg-transparent hover:bg-gray-100 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white",
};

/**
 * Mapa de classes CSS para cada tamanho
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-6 py-2",
  lg: "px-8 py-3 text-lg",
};

/**
 * Componente de Button padronizado
 * Segue o padrão visual do sistema com variantes e estados
 *
 * @example
 * <Button variant="primary" loading={isSaving}>
 *   Salvar
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      icon,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${
          fullWidth ? "w-full" : ""
        } ${sizeClasses[size]} ${variantClasses[variant]} flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            <span>Carregando...</span>
          </>
        ) : (
          <>
            {icon && <span className="flex items-center">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
