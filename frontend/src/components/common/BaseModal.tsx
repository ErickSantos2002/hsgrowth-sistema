import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

/**
 * Tamanhos disponíveis para a modal
 */
type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

/**
 * Props do componente BaseModal
 */
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  titleClassName?: string;
}

/**
 * Mapa de classes CSS para cada tamanho de modal
 */
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  full: "max-w-7xl",
};

/**
 * Componente base de Modal reutilizável
 *
 * Segue o padrão visual moderno com:
 * - Esquema de cores Slate (mais profissional)
 * - Bordas bem definidas
 * - Header fixo com título e subtítulo
 * - Conteúdo scrollável
 * - Footer fixo customizável
 * - Backdrop blur
 * - Animações suaves
 *
 * @example
 * <BaseModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Novo Card"
 *   subtitle="Preencha os dados do card"
 *   size="lg"
 *   footer={
 *     <div className="flex gap-3">
 *       <button onClick={onCancel}>Cancelar</button>
 *       <button onClick={onSave}>Salvar</button>
 *     </div>
 *   }
 * >
 *   <form>...</form>
 * </BaseModal>
 */
const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "lg",
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = "",
  titleClassName = "",
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Renderiza o modal usando Portal para garantir que fique acima de tudo
  const modalContent = (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full rounded-2xl border border-slate-700 bg-slate-900 ${sizeClasses[size]} flex max-h-[90vh] flex-col overflow-hidden ${className}`}
      >
        {/* Header fixo */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-6">
          <div>
            <h2 className={`text-2xl font-bold text-white ${titleClassName}`}>{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              type="button"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer fixo (opcional) */}
        {footer && (
          <div className="flex-shrink-0 border-t border-slate-700 bg-slate-900 p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Renderiza usando Portal direto no body
  return ReactDOM.createPortal(modalContent, document.body);
};

export default BaseModal;
