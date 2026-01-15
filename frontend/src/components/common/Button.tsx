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
 * Mapa de classes CSS para cada variante
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white",
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
        } ${sizeClasses[size]} ${variantClasses[variant]} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
