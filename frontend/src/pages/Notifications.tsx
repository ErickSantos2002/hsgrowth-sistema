import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  X,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  ArrowDownCircle,
  Award,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import notificationService from "../services/notificationService";
import { Notification, NotificationType } from "../types";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedType, setSelectedType] = useState<NotificationType | "all">("all");
  const navigate = useNavigate();

  const pageSize = 20;

  useEffect(() => {
    loadNotifications();
  }, [page, filterUnread]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.list(page, pageSize, filterUnread);
      setNotifications(response.notifications);
      setTotal(response.total);
      setUnreadCount(response.unread_count);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      // Mock de notificações para demonstração
      const mockData = getMockNotifications();
      setNotifications(mockData);
      setTotal(mockData.length);
      setUnreadCount(mockData.filter(n => !n.is_read).length);
      setTotalPages(Math.ceil(mockData.length / pageSize));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markOneAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar esta notificação?")) return;

    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  const handleDeleteAllRead = async () => {
    if (!confirm("Tem certeza que deseja deletar todas as notificações lidas?")) return;

    try {
      await notificationService.deleteAllRead();
      setNotifications(prev => prev.filter(n => !n.is_read));
      setTotal(notifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Erro ao deletar notificações lidas:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
      card_assigned: <FileText size={20} />,
      card_updated: <Edit size={20} />,
      card_won: <CheckCircle size={20} />,
      card_lost: <XCircle size={20} />,
      transfer_received: <ArrowDownCircle size={20} />,
      transfer_approved: <CheckCircle size={20} />,
      transfer_rejected: <XCircle size={20} />,
      badge_earned: <Award size={20} />,
      level_up: <TrendingUp size={20} />,
      automation_failed: <AlertCircle size={20} />,
      system: <Bell size={20} />,
      other: <Info size={20} />,
    };
    return iconMap[type] || <Bell size={20} />;
  };

  // Filtra por tipo se selecionado
  const filteredNotifications = selectedType === "all"
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Bell className="text-blue-400" size={32} />
          Notificações
        </h1>
        <p className="text-slate-400">
          Veja todas as suas notificações e mantenha-se atualizado
        </p>
      </div>

      {/* Filtros e Ações */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filterUnread
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <Filter size={16} />
              {filterUnread ? "Apenas não lidas" : "Todas"}
            </button>

            {unreadCount > 0 && (
              <span className="px-3 py-2 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/30">
                {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCheck size={16} />
                Marcar todas como lidas
              </button>
            )}

            {notifications.some(n => n.is_read) && (
              <button
                onClick={handleDeleteAllRead}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 size={16} />
                Deletar lidas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Notificações */}
      {loading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Bell size={48} className="mx-auto text-slate-600 mb-4 animate-pulse" />
          <p className="text-slate-400">Carregando notificações...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Bell size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg mb-2">
            {filterUnread ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
          </p>
          <p className="text-slate-500 text-sm">
            {filterUnread
              ? "Todas as suas notificações estão marcadas como lidas"
              : "Você não tem notificações no momento"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-slate-800/50 border border-slate-700 rounded-xl p-4 transition-all ${
                  notification.link ? "cursor-pointer hover:bg-slate-700/50 hover:border-slate-600" : ""
                } ${!notification.is_read ? "bg-slate-700/50 border-blue-500/30" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Ícone */}
                  <div className={`flex-shrink-0 ${notificationService.getTypeColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`text-base ${notification.is_read ? "text-slate-300" : "text-white font-semibold"}`}>
                        {notification.title}
                      </h3>
                      <span className="flex-shrink-0 text-xs text-slate-500">
                        {notificationService.formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400">
                        {notificationService.formatType(notification.type)}
                      </span>
                      {!notification.is_read && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-medium">
                          Nova
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-shrink-0 gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Marcar como lida"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <p className="text-sm text-slate-400">
                Página {page} de {totalPages} • Total: {total} notificações
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium">
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Mock de notificações para demonstração (backend ainda não implementado)
const getMockNotifications = (): Notification[] => {
  const now = new Date();
  const baseTime = now.getTime();

  return [
    {
      id: 1,
      user_id: 1,
      type: "card_assigned",
      title: "Novo card atribuído",
      message: "O card 'Proposta Cliente XYZ' foi atribuído para você por João Silva",
      link: "/cards/123",
      is_read: false,
      created_at: new Date(baseTime - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      user_id: 1,
      type: "transfer_approved",
      title: "Transferência aprovada",
      message: "Sua transferência do card 'Lead ABC' foi aprovada pelo gerente",
      link: "/transfers",
      is_read: false,
      created_at: new Date(baseTime - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      user_id: 1,
      type: "badge_earned",
      title: "Novo badge conquistado!",
      message: "Parabéns! Você conquistou o badge 'Vendedor do Mês'",
      link: "/gamification",
      is_read: false,
      created_at: new Date(baseTime - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      user_id: 1,
      type: "card_won",
      title: "Card ganho",
      message: "O card 'Negociação Empresa Y' foi marcado como ganho!",
      link: "/cards/456",
      is_read: true,
      created_at: new Date(baseTime - 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(baseTime - 23 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      user_id: 1,
      type: "level_up",
      title: "Subiu de nível!",
      message: "Você alcançou o nível 5 - Continue assim!",
      link: "/gamification",
      is_read: true,
      created_at: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 6,
      user_id: 1,
      type: "card_updated",
      title: "Card atualizado",
      message: "O card 'Proposta XYZ' foi atualizado por Maria Santos",
      link: "/cards/789",
      is_read: true,
      created_at: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 7,
      user_id: 1,
      type: "transfer_received",
      title: "Transferência recebida",
      message: "Você recebeu a transferência do card 'Lead 456' de Pedro Costa",
      link: "/transfers",
      is_read: true,
      created_at: new Date(baseTime - 4 * 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(baseTime - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export default Notifications;
