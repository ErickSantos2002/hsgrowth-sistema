/**
 * Service para gerenciamento de avatares de usuário.
 */
import api from './api';

const avatarService = {
  /**
   * Faz upload de avatar do usuário atual
   * @param file Arquivo de imagem
   * @returns URL do avatar
   */
  async uploadAvatar(file: File): Promise<{ message: string; avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/v1/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Obtém URL do avatar de um usuário
   * @param userId ID do usuário
   * @returns URL completa do avatar
   */
  getAvatarUrl(userId: number): string {
    const baseURL = api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return `${baseURL}/api/v1/users/${userId}/avatar`;
  },

  /**
   * Remove avatar do usuário atual
   */
  async deleteAvatar(): Promise<void> {
    await api.delete('/api/v1/users/me/avatar');
  },

  /**
   * Valida arquivo de imagem antes de fazer upload
   * @param file Arquivo a ser validado
   * @returns Objeto com valid (boolean) e error (string)
   */
  validateAvatar(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    // Validar tamanho
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Imagem muito grande. Tamanho máximo: 5MB',
      };
    }

    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo não permitido: ${file.type}. Tipos permitidos: JPG, PNG, GIF, WEBP`,
      };
    }

    return { valid: true };
  },
};

export default avatarService;
