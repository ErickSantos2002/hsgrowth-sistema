import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { BaseModal, Button, Alert } from "../common";
import { showWarning } from "../../utils/toast";

// Opções fixas de detalhamento disponíveis para reabertura via canal Base
const REOPEN_DETAIL_OPTIONS = [
  "Base - Resgate",
  "Base - Levantada de mão",
];

interface ReopenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_title: string, _detail: string) => void;
  originalTitle: string;
  isLoading?: boolean;
}

/**
 * Modal de reabertura de negócio perdido.
 * Permite ao vendedor editar o título e selecionar o detalhamento do canal Base
 * antes de criar o clone do negócio na lista de Prospecção.
 */
const ReopenModal: React.FC<ReopenModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalTitle,
  isLoading = false,
}) => {
  const [title, setTitle] = useState(originalTitle);
  const [selectedDetail, setSelectedDetail] = useState<string>("");

  // Sincroniza o título sempre que o modal abrir com um novo card
  useEffect(() => {
    if (isOpen) {
      setTitle(originalTitle);
      setSelectedDetail("");
    }
  }, [isOpen, originalTitle]);

  /**
   * Valida e confirma a reabertura
   */
  const handleConfirm = () => {
    if (!title.trim()) {
      showWarning("Por favor, informe o título do negócio");
      return;
    }
    if (!selectedDetail) {
      showWarning("Por favor, selecione o detalhamento do canal");
      return;
    }
    onConfirm(title.trim(), selectedDetail);
  };

  /**
   * Fecha e reseta o estado do modal
   */
  const handleClose = () => {
    setTitle(originalTitle);
    setSelectedDetail("");
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reabrir Negócio"
      subtitle="Um novo card será criado a partir deste negócio perdido"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!title.trim() || !selectedDetail || isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Reabrir Negócio
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Campo de título */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Título do novo negócio
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Digite o título do negócio"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {/* Seleção do detalhamento do canal */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Canal de Aquisição - Detalhamento
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            O canal será definido como <strong className="text-slate-400 dark:text-slate-400">Base</strong>. Selecione o detalhamento:
          </p>
          <div className="space-y-2">
            {REOPEN_DETAIL_OPTIONS.map((option) => (
              <label
                key={option}
                className={`
                  flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all
                  ${
                    selectedDetail === option
                      ? "border-blue-500/50 bg-blue-500/20 text-slate-900 dark:text-white"
                      : "border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-900"
                  }
                  ${isLoading ? "cursor-not-allowed opacity-60" : ""}
                `}
              >
                <input
                  type="radio"
                  name="reopen-detail"
                  value={option}
                  checked={selectedDetail === option}
                  onChange={(e) => setSelectedDetail(e.target.value)}
                  disabled={isLoading}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Aviso informativo */}
        <Alert type="info">
          O negócio original permanece como perdido. Um novo card será criado na
          lista de Prospecção com os dados copiados deste negócio.
        </Alert>
      </div>
    </BaseModal>
  );
};

export default ReopenModal;
