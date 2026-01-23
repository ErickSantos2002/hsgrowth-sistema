import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
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
} from "lucide-react";
import notificationService from "../services/notificationService";
import { Notification, NotificationType } from "../types";

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carrega notificações iniciais e contador
  useEffect(() => {
    loadUnreadCount();
    // Polling a cada 30 segundos para atualizar contador
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Detecta quando contador aumenta (nova notificação) e recarrega lista automaticamente
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      // Nova notificação detectada! Recarrega a lista
      loadNotifications();
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount]);

  // Sempre recarrega notificações quando abre o dropdown
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Erro ao carregar contador:", error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.list(1, 10, true); // Últimas 10 não lidas
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      // Mock de notificações para demonstração (filtra apenas não lidas)
      const mockData = getMockNotifications().filter(n => !n.is_read);
      setNotifications(mockData);
      setUnreadCount(mockData.length);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markOneAsRead(id);
      // Remove da lista pois o dropdown só mostra não lidas
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Limpa toda a lista pois o dropdown só mostra não lidas
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marca como lida
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navega para o link se existir
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
      card_assigned: <FileText size={18} />,
      card_updated: <Edit size={18} />,
      card_won: <CheckCircle size={18} />,
      card_lost: <XCircle size={18} />,
      transfer_received: <ArrowDownCircle size={18} />,
      transfer_approved: <CheckCircle size={18} />,
      transfer_rejected: <XCircle size={18} />,
      badge_earned: <Award size={18} />,
      level_up: <TrendingUp size={18} />,
      automation_failed: <AlertCircle size={18} />,
      system: <Bell size={18} />,
      other: <Info size={18} />,
    };
    return iconMap[type] || <Bell size={18} />;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Botão de Notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
          {/* Header do Dropdown */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h3 className="text-white font-semibold">Notificações</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-400">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Ver todas
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-colors ${
                      notification.link ? "cursor-pointer hover:bg-slate-700/50" : ""
                    } ${!notification.is_read ? "bg-slate-700/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className={`flex-shrink-0 ${notificationService.getTypeColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.is_read ? "text-slate-300" : "text-white font-medium"}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {notificationService.formatRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Indicador não lida + botão marcar como lida */}
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Mock de notificações para demonstração (backend ainda não implementado)
const getMockNotifications = (): Notification[] => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 1,
      user_id: 1,
      type: "card_assigned",
      title: "Novo card atribuído",
      message: "O card 'Proposta Cliente XYZ' foi atribuído para você",
      link: "/cards/123",
      is_read: false,
      created_at: fiveMinutesAgo.toISOString(),
    },
    {
      id: 2,
      user_id: 1,
      type: "transfer_approved",
      title: "Transferência aprovada",
      message: "Sua transferência do card 'Lead ABC' foi aprovada pelo gerente",
      link: "/transfers",
      is_read: false,
      created_at: oneHourAgo.toISOString(),
    },
    {
      id: 3,
      user_id: 1,
      type: "badge_earned",
      title: "Novo badge conquistado!",
      message: "Parabéns! Você conquistou o badge 'Vendedor do Mês'",
      link: "/gamification",
      is_read: false,
      created_at: oneHourAgo.toISOString(),
    },
    {
      id: 4,
      user_id: 1,
      type: "card_won",
      title: "Card ganho",
      message: "O card 'Negociação Empresa Y' foi marcado como ganho!",
      link: "/cards/456",
      is_read: true,
      created_at: oneDayAgo.toISOString(),
      read_at: now.toISOString(),
    },
    {
      id: 5,
      user_id: 1,
      type: "level_up",
      title: "Subiu de nível!",
      message: "Você alcançou o nível 5 - Continue assim!",
      link: "/gamification",
      is_read: true,
      created_at: twoDaysAgo.toISOString(),
      read_at: now.toISOString(),
    },
  ];
};

export default NotificationDropdown;
