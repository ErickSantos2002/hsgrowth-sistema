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
        <div className="flex gap-3 justify-end">
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
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <span>Esta é uma ação destrutiva e permanente.</span>
            </div>
          </Alert>
        ) : (
          <Alert type="warning">
            Por favor, confirme se deseja continuar com esta ação.
          </Alert>
        )}

        {/* Mensagem principal */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-200 leading-relaxed">{message}</p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
