import React from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success" | "danger";
  disabled?: boolean;
  className?: string;
}

/**
 * Botão de ação rápida - Tema escuro
 * Usado para ações como: WhatsApp, Email, Ligar, LinkedIn, etc.
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = "secondary",
  disabled = false,
  className = "",
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50";
      case "success":
        return "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/50";
      case "danger":
        return "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50";
      case "secondary":
      default:
        return "bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border-slate-700 hover:border-slate-600";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-3 py-2 border rounded-lg
        font-medium text-sm transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${className}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;
