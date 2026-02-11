import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { LOSS_REASONS_BY_BOARD_ID } from "../../constants/blueprintOptions";
import { BaseModal, Button, Alert } from "../common";
import { showWarning } from "../../utils/toast";

interface LossReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_reason: string) => void;
  boardId: number;
  boardName: string;
}

/**
 * Modal para seleção do motivo da perda
 * Aparece quando o usuário marca um card como perdido
 * Obriga a seleção de um motivo antes de confirmar
 */
const LossReasonModal: React.FC<LossReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  boardId,
  boardName,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");

  // Obtém os motivos específicos do board atual
  const reasons = LOSS_REASONS_BY_BOARD_ID[boardId] || [];

  /**
   * Handler para confirmar a perda
   */
  const handleConfirm = () => {
    if (!selectedReason) {
      showWarning("Por favor, selecione um motivo da perda");
      return;
    }
    onConfirm(selectedReason);
    setSelectedReason(""); // Limpa seleção após confirmar
  };

  /**
   * Handler para fechar a modal
   */
  const handleClose = () => {
    setSelectedReason(""); // Limpa seleção ao fechar
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Motivo da Perda"
      subtitle={`Board: ${boardName}`}
      size="lg"
      icon={
        <div className="rounded-lg bg-red-500/20 p-2">
          <AlertCircle className="text-red-400" size={24} />
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!selectedReason}
          >
            Confirmar Perda
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-300">
          Por que este negócio foi perdido? Selecione o motivo abaixo:
        </p>

        {/* Lista de motivos */}
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {reasons.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum motivo cadastrado para este board</p>
            </div>
          ) : (
            reasons.map((reason) => (
              <label
                key={reason}
                className={`
                  flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all
                  ${
                    selectedReason === reason
                      ? "border-red-500/50 bg-red-500/20 text-white"
                      : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
                  }
                `}
              >
                <input
                  type="radio"
                  name="loss-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="h-4 w-4 text-red-500 focus:ring-red-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium">{reason}</span>
              </label>
            ))
          )}
        </div>

        {/* Aviso de ação irreversível */}
        <Alert type="warning">
          Esta ação marcará o negócio como perdido e não poderá ser desfeita facilmente.
          Certifique-se de selecionar o motivo correto.
        </Alert>
      </div>
    </BaseModal>
  );
};

export default LossReasonModal;
