import React from "react";
import { AlertTriangle } from "lucide-react";
import { BaseModal, Button, Alert } from "../common";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDanger?: boolean;
}

/**
 * Modal de confirmação para ações importantes
 * Exibe um alerta e pede confirmação do usuário
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  isDanger = false,
}) => {
  /**
   * Handler de confirmação
   * Executa a ação e fecha a modal
   */
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={isDanger ? "Esta ação não pode ser desfeita" : undefined}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={isDanger ? "danger" : "primary"} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Alerta visual baseado no tipo */}
        {isDanger ? (
          <Alert type="error" title="Atenção!">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <span>Esta é uma ação destrutiva e permanente.</span>
            </div>
          </Alert>
        ) : (
          <Alert type="warning">
            Por favor, confirme se deseja continuar com esta ação.
          </Alert>
        )}

        {/* Mensagem principal */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="leading-relaxed text-slate-700 dark:text-slate-200">{message}</p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
