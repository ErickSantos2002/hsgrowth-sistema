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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden ${className}`}
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className={`text-2xl font-bold text-white ${titleClassName}`}>{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
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
          <div className="flex-shrink-0 p-6 border-t border-slate-700 bg-slate-900">
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
