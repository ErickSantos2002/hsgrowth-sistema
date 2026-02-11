import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { LOSS_REASONS_BY_BOARD_ID } from "../../constants/blueprintOptions";

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
      alert("Por favor, selecione um motivo da perda");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <AlertCircle className="text-red-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Motivo da Perda</h2>
              <p className="text-sm text-slate-400">Board: {boardName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 transition-colors hover:text-white"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
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

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">
              Esta ação marcará o negócio como perdido e não poderá ser desfeita facilmente.
              Certifique-se de selecionar o motivo correto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-700 p-6">
          <button
            onClick={handleClose}
            className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason}
            className={`
              rounded-lg px-4 py-2 font-medium transition-all
              ${
                selectedReason
                  ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20 hover:from-red-700 hover:to-red-600"
                  : "cursor-not-allowed bg-slate-700 text-slate-500"
              }
            `}
          >
            Confirmar Perda
          </button>
        </div>
      </div>
    </div>
  );
};

export default LossReasonModal;
