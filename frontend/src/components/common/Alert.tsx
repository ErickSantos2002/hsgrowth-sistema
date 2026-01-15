import React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle, HelpCircle } from "lucide-react";

/**
 * Tipos de alerta
 */
type AlertType = "info" | "success" | "warning" | "error" | "help";

/**
 * Props do componente Alert
 */
interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Configuração de ícones e estilos por tipo
 */
const alertConfig: Record<
  AlertType,
  {
    icon: React.ReactNode;
    bgClass: string;
    borderClass: string;
    textClass: string;
    iconClass: string;
  }
> = {
  info: {
    icon: <Info size={18} />,
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-200",
    iconClass: "text-blue-400",
  },
  success: {
    icon: <CheckCircle2 size={18} />,
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-200",
    iconClass: "text-emerald-400",
  },
  warning: {
    icon: <AlertCircle size={18} />,
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
    textClass: "text-orange-200",
    iconClass: "text-orange-400",
  },
  error: {
    icon: <XCircle size={18} />,
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
    textClass: "text-red-200",
    iconClass: "text-red-400",
  },
  help: {
    icon: <HelpCircle size={18} />,
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/30",
    textClass: "text-indigo-200",
    iconClass: "text-indigo-400",
  },
};

/**
 * Componente de Alert padronizado
 * Exibe mensagens de feedback com diferentes níveis de severidade
 *
 * @example
 * <Alert type="success" title="Sucesso!">
 *   Card criado com sucesso
 * </Alert>
 */
const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  children,
  className = "",
}) => {
  const config = alertConfig[type];

  return (
    <div
      className={`${config.bgClass} border ${config.borderClass} rounded-xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.iconClass} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${config.textClass} mb-1`}>{title}</h4>
          )}
          <div className={`text-sm ${config.textClass}`}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Alert;
