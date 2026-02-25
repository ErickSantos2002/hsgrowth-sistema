/**
 * Service para gerenciamento de Attachments (arquivos anexados).
 * Comunicação com a API de uploads.
 */
import api from './api';

// ========== Interfaces ==========

export interface Attachment {
  id: number;
  card_id: number;
  uploaded_by_id?: number;

  // Informações do arquivo
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;

  // Tipo do anexo: 'general' ou 'proposal'
  attachment_type: string;

  // Informações do uploader
  uploader_name?: string;
  uploader_email?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Propriedades calculadas
  file_size_mb?: number;
  file_extension?: string;
  is_image?: boolean;
  is_pdf?: boolean;
  is_document?: boolean;
}

export interface AttachmentListResponse {
  attachments: Attachment[];
  total: number;
  total_size_mb: number;
}

// ========== Service ==========

const attachmentService = {
  /**
   * Upload de arquivo para um card
   * @param cardId ID do card
   * @param file Arquivo a ser enviado
   * @param attachmentType Tipo do anexo: 'general' (padrão) ou 'proposal'
   * @returns Informações do arquivo enviado
   */
  async uploadFile(cardId: number, file: File, attachmentType: string = 'general'): Promise<Attachment> {
    // Criar FormData para enviar arquivo e tipo
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachment_type', attachmentType);

    const response = await api.post(
      `/api/v1/cards/${cardId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Lista todos os arquivos de um card
   * @param cardId ID do card
   * @returns Lista de arquivos com estatísticas
   */
  async listFiles(cardId: number): Promise<AttachmentListResponse> {
    const response = await api.get(`/api/v1/cards/${cardId}/attachments`);
    return response.data;
  },

  /**
   * Download de arquivo
   * @param attachmentId ID do attachment
   * @returns URL do blob para download
   */
  async downloadFile(attachmentId: number): Promise<Blob> {
    const response = await api.get(
      `/api/v1/attachments/${attachmentId}/download`,
      {
        responseType: 'blob', // Importante para receber arquivo binário
      }
    );

    return response.data;
  },

  /**
   * Deleta um arquivo
   * @param attachmentId ID do attachment
   */
  async deleteFile(attachmentId: number): Promise<void> {
    await api.delete(`/api/v1/attachments/${attachmentId}`);
  },

  /**
   * Helper: Inicia download do arquivo no navegador
   * @param attachmentId ID do attachment
   * @param filename Nome do arquivo para download
   */
  async triggerDownload(attachmentId: number, filename: string): Promise<void> {
    try {
      const blob = await this.downloadFile(attachmentId);

      // Criar URL temporário do blob
      const url = window.URL.createObjectURL(blob);

      // Criar link temporário e clicar automaticamente
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      throw error;
    }
  },

  /**
   * Helper: Valida arquivo antes de fazer upload
   * @param file Arquivo a ser validado
   * @returns Objeto com valid (boolean) e error (string)
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB

    const allowedTypes = [
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      // Imagens
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Compactados
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    // Validar tamanho
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Arquivo muito grande. Tamanho máximo: 10MB'
      };
    }

    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo não permitido: ${file.type}. Tipos permitidos: PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z`
      };
    }

    return { valid: true };
  },

  /**
   * Helper: Retorna ícone apropriado baseado no tipo de arquivo
   * @param mimeType Tipo MIME do arquivo
   * @returns Nome do ícone Lucide
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'FileImage';
    if (mimeType === 'application/pdf') return 'FileText';
    if (mimeType.includes('word')) return 'FileText';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'FileSpreadsheet';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'FileArchive';
    if (mimeType === 'text/plain') return 'FileText';
    if (mimeType === 'text/csv') return 'FileSpreadsheet';
    return 'File';
  },

  /**
   * Helper: Formata tamanho do arquivo para exibição
   * @param bytes Tamanho em bytes
   * @returns String formatada (ex: "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

export default attachmentService;
