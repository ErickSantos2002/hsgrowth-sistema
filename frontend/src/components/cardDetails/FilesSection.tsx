import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Download,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Eye
} from "lucide-react";
import attachmentService, { Attachment, AttachmentListResponse } from "../../services/attachmentService";
import FilePreviewModal from "./FilePreviewModal";
import { showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface FilesSectionProps {
  cardId: number;
  readOnly?: boolean;
}

/**
 * Seção de Arquivos - Upload e gerenciamento de arquivos anexados ao card
 */
const FilesSection: React.FC<FilesSectionProps> = ({ cardId, readOnly = false }) => {
  const { confirm } = useConfirm();
  // Estados
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar arquivos ao montar componente
  useEffect(() => {
    loadFiles();
  }, [cardId]);

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewAttachment) {
        setPreviewAttachment(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [previewAttachment]);

  /**
   * Carrega lista de arquivos do card
   */
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: AttachmentListResponse = await attachmentService.listFiles(cardId);
      setAttachments(response.attachments);
      setTotalSize(response.total_size_mb);
    } catch (err: any) {
      console.error("Erro ao carregar arquivos:", err);
      showError("Erro ao carregar arquivos");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Faz upload de arquivo(s)
   */
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload de cada arquivo
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar arquivo
        const validation = attachmentService.validateFile(file);
        if (!validation.valid) {
          setError(validation.error || "Arquivo inválido");
          continue;
        }

        // Fazer upload
        await attachmentService.uploadFile(cardId, file);
      }

      // Recarregar lista de arquivos
      await loadFiles();
    } catch (err: any) {
      console.error("Erro ao fazer upload:", err);
      showError(err.response?.data?.detail || "Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * Faz download de um arquivo
   */
  const handleDownload = async (attachment: Attachment) => {
    try {
      await attachmentService.triggerDownload(attachment.id, attachment.original_filename);
    } catch (err) {
      console.error("Erro ao fazer download:", err);
      showError("Erro ao fazer download do arquivo");
    }
  };

  /**
   * Deleta um arquivo
   */
  const handleDelete = async (attachmentId: number) => {
    const confirmed = await confirm({
      title: "Deletar arquivo",
      message: "Tem certeza que deseja deletar este arquivo? Esta ação não pode ser desfeita.",
      confirmText: "Deletar",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await attachmentService.deleteFile(attachmentId);
      await loadFiles(); // Recarregar lista
    } catch (err) {
      console.error("Erro ao deletar arquivo:", err);
      showError("Erro ao deletar arquivo");
    }
  };

  /**
   * Retorna ícone apropriado para o tipo de arquivo
   */
  const getFileIcon = (mimeType: string) => {
    const iconProps = { size: 20 };

    if (mimeType.startsWith('image/')) return <FileImage {...iconProps} className="text-green-400" />;
    if (mimeType === 'application/pdf') return <FileText {...iconProps} className="text-red-400" />;
    if (mimeType.includes('word')) return <FileText {...iconProps} className="text-blue-400" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet {...iconProps} className="text-emerald-400" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return <FileArchive {...iconProps} className="text-yellow-400" />;

    return <File {...iconProps} className="text-slate-400 dark:text-slate-400" />;
  };

  // Handlers de drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleUpload(files);
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload - oculta para visualizadores */}
      {!readOnly && <div
        className={`
          rounded-lg border-2 border-dashed transition-all
          ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-200 dark:border-slate-700 bg-gray-100/30 dark:bg-slate-800/30'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-cyan-600'}
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          {uploading ? (
            <div className="space-y-2">
              <Loader2 size={32} className="mx-auto animate-spin text-cyan-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Enviando arquivo...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="mx-auto text-cyan-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z - Máximo 10MB
              </p>
            </div>
          )}
        </div>

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z"
        />
      </div>}

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/20 p-3">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Lista de Arquivos */}
      {loading ? (
        <div className="py-8 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-cyan-400" />
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">Carregando arquivos...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/30 dark:bg-slate-800/30 p-6 text-center">
          <File size={32} className="mx-auto text-slate-600" />
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">Nenhum arquivo anexado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {attachments.length} arquivo{attachments.length !== 1 ? 's' : ''} ({totalSize.toFixed(2)} MB)
            </p>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-3 transition-all hover:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                {/* Ícone do tipo de arquivo */}
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.mime_type)}
                </div>

                {/* Informações do arquivo */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {attachment.original_filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400">
                    <span>{attachmentService.formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{attachment.uploader_name || 'Desconhecido'}</span>
                    <span>•</span>
                    <span>{new Date(attachment.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  {/* Botão Visualizar (apenas para imagens e PDFs) */}
                  {(attachment.is_image || attachment.is_pdf) && (
                    <button
                      onClick={() => setPreviewAttachment(attachment)}
                      className="rounded-lg p-2 text-purple-400 transition-all hover:bg-purple-500/20"
                      title="Visualizar arquivo"
                    >
                      <Eye size={16} />
                    </button>
                  )}

                  {/* Botão Download */}
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="rounded-lg p-2 text-cyan-400 transition-all hover:bg-cyan-500/20"
                    title="Baixar arquivo"
                  >
                    <Download size={16} />
                  </button>

                  {/* Botão Deletar - oculto para visualizadores */}
                  {!readOnly && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="rounded-lg p-2 text-red-400 transition-all hover:bg-red-500/20"
                      title="Deletar arquivo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {previewAttachment && (
        <FilePreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};

export default FilesSection;
