import React from "react";

/**
 * Props do LoadingSpinner
 */
interface LoadingSpinnerProps {
  /**
   * Tamanho do spinner
   * @default "md"
   */
  size?: "sm" | "md" | "lg" | "xl";

  /**
   * Cor do spinner (usa classes Tailwind)
   * @default "border-primary-500"
   */
  color?: string;

  /**
   * Classes CSS adicionais
   */
  className?: string;

  /**
   * Texto a ser exibido abaixo do spinner
   */
  label?: string;
}

/**
 * LoadingSpinner - Indicador de carregamento padronizado
 *
 * Spinner animado para indicar loading states de forma consistente.
 *
 * @example
 * ```tsx
 * // Spinner simples
 * <LoadingSpinner />
 *
 * // Spinner grande com label
 * <LoadingSpinner size="lg" label="Carregando..." />
 *
 * // Spinner pequeno inline
 * <Button disabled>
 *   <LoadingSpinner size="sm" className="mr-2" />
 *   Salvando...
 * </Button>
 * ```
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "border-primary-500",
  className = "",
  label,
}) => {
  // Mapeamento de tamanhos
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Spinner */}
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-slate-700 border-t-${color} ${color}`}
        role="status"
        aria-label={label || "Carregando"}
      />

      {/* Label opcional */}
      {label && (
        <span className={`${labelSizeClasses[size]} text-slate-400`}>
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * LoadingOverlay - Overlay de loading para cobrir conteúdo
 *
 * @example
 * ```tsx
 * {loading && <LoadingOverlay label="Processando..." />}
 * ```
 */
export const LoadingOverlay: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
};

export default LoadingSpinner;
