import api from "./api";
import {
  Notification,
  NotificationListResponse,
  NotificationType,
  MarkAsReadRequest,
} from "../types";
import { infoDoAviso } from "../utils/avisos";

/**
 * Serviço de Notificações
 * Gerencia notificações do usuário
 */
class NotificationService {
  /**
   * Lista notificações do usuário autenticado
   */
  async list(
    page: number = 1,
    pageSize: number = 20,
    unreadOnly: boolean = false
  ): Promise<NotificationListResponse> {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };

    if (unreadOnly) {
      params.unread_only = true;
    }

    const response = await api.get<NotificationListResponse>(
      "/api/v1/notifications",
      { params }
    );
    return response.data;
  }

  /**
   * Busca uma notificação específica por ID
   */
  async getById(id: number): Promise<Notification> {
    const response = await api.get<Notification>(`/api/v1/notifications/${id}`);
    return response.data;
  }

  /**
   * Marca notificação(ões) como lida(s)
   */
  async markAsRead(notificationIds: number[]): Promise<{ message: string }> {
    const payload: MarkAsReadRequest = { notification_ids: notificationIds };
    const response = await api.post<{ message: string }>(
      "/api/v1/notifications/mark-as-read",
      payload
    );
    return response.data;
  }

  /**
   * Marca uma única notificação como lida
   */
  async markOneAsRead(notificationId: number): Promise<{ message: string }> {
    return this.markAsRead([notificationId]);
  }

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/api/v1/notifications/mark-all-as-read"
    );
    return response.data;
  }

  /**
   * Deleta uma notificação
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/api/v1/notifications/${id}`
    );
    return response.data;
  }

  /**
   * Deleta todas as notificações lidas
   */
  async deleteAllRead(): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      "/api/v1/notifications/delete-read"
    );
    return response.data;
  }

  /**
   * Retorna contador de notificações não lidas
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ unread_count: number }>(
      "/api/v1/notifications/unread-count"
    );
    return response.data.unread_count;
  }

  /**
   * Formata o tipo de notificação para exibição
   */
  formatType(type: NotificationType): string {
    return infoDoAviso(type).rotulo;
  }

  /**
   * Retorna cor para cada tipo de notificação
   */
  getTypeColor(type: NotificationType): string {
    return infoDoAviso(type).cor;
  }

  /**
   * Formata data/hora relativa (ex: "há 5 minutos")
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return "Agora";
    } else if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
    } else {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    }
  }
}

export default new NotificationService();
