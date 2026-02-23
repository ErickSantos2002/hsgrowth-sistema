import React, { useState, useEffect } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import BaseModal from "../common/BaseModal";
import attachmentService, { Attachment } from "../../services/attachmentService";

interface FilePreviewModalProps {
  attachment: Attachment;
  onClose: () => void;
}

/**
 * Modal para preview de arquivos (imagens e PDFs)
 * Usa o BaseModal padrão do sistema
 */
const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ attachment, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega o arquivo quando o modal abre
  useEffect(() => {
    loadFile();

    // Cleanup: revoga URL do blob quando o componente desmonta
    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [attachment.id]);

  /**
   * Carrega o arquivo e cria URL do blob
   */
  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);

      const blob = await attachmentService.downloadFile(attachment.id);
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err: any) {
      console.error("Erro ao carregar arquivo:", err);
      setError("Erro ao carregar arquivo para preview");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Faz download do arquivo
   */
  const handleDownload = async () => {
    try {
      await attachmentService.triggerDownload(attachment.id, attachment.original_filename);
    } catch (err) {
      console.error("Erro ao fazer download:", err);
    }
  };

  /**
   * Verifica se o arquivo pode ser visualizado
   */
  const canPreview = attachment.is_image || attachment.is_pdf;

  // Footer com botão de download e dica
  const footer = (
    <div className="flex items-center justify-between">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Pressione <kbd className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-1">ESC</kbd> para fechar
      </p>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-slate-900 dark:text-white transition-all hover:bg-cyan-700"
      >
        <Download size={16} />
        Baixar arquivo
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={attachment.original_filename}
      subtitle={`${attachmentService.formatFileSize(attachment.file_size)} • ${attachment.mime_type}`}
      size="2xl"
      footer={footer}
      className="h-[90vh]"
    >
      {/* Conteúdo do preview */}
      <div className="flex h-full items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400 dark:text-slate-400">Carregando arquivo...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        ) : !canPreview ? (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={40} className="text-yellow-400" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Preview não disponível para este tipo de arquivo
            </p>
            <button
              onClick={handleDownload}
              className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-slate-900 dark:text-white transition-all hover:bg-cyan-700"
            >
              Baixar arquivo
            </button>
          </div>
        ) : blobUrl ? (
          <>
            {/* Preview de Imagem */}
            {attachment.is_image && (
              <img
                src={blobUrl}
                alt={attachment.original_filename}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            )}

            {/* Preview de PDF */}
            {attachment.is_pdf && (
              <iframe
                src={blobUrl}
                className="h-full w-full rounded-lg border border-gray-200 dark:border-slate-700"
                title={attachment.original_filename}
              />
            )}
          </>
        ) : null}
      </div>
    </BaseModal>
  );
};

export default FilePreviewModal;
