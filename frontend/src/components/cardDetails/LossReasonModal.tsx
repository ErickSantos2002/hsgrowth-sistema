import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { LOSS_REASONS_BY_BOARD_ID } from "../../constants/blueprintOptions";

interface LossReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="text-red-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Motivo da Perda</h2>
              <p className="text-sm text-slate-400">Board: {boardName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-300">
            Por que este negócio foi perdido? Selecione o motivo abaixo:
          </p>

          {/* Lista de motivos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {reasons.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum motivo cadastrado para este board</p>
              </div>
            ) : (
              reasons.map((reason) => (
                <label
                  key={reason}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedReason === reason
                        ? "bg-red-500/20 border-red-500/50 text-white"
                        : "bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-900 hover:border-slate-600"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="loss-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-offset-slate-800"
                  />
                  <span className="text-sm font-medium">{reason}</span>
                </label>
              ))
            )}
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              Esta ação marcará o negócio como perdido e não poderá ser desfeita facilmente.
              Certifique-se de selecionar o motivo correto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${
                selectedReason
                  ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/20"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
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
