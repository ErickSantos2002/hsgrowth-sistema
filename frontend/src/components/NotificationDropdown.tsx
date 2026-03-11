import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
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
import { Notification as AppNotification, NotificationType } from "../types";
import { showError } from "../utils/toast";
import logo from "../assets/logo.png";

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Guarda IDs das notificações já exibidas como browser notification para não repetir
  const shownBrowserNotificationIds = useRef<Set<number>>(new Set());

  /**
   * Exibe uma notificação nativa do browser para cada notificação nova recebida.
   * Ao clicar, foca a aba e navega para o card correspondente.
   */
  const showBrowserNotifications = useCallback((newNotifications: AppNotification[]) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    newNotifications.forEach((notification) => {
      // Ignora se já foi exibida anteriormente nesta sessão
      if (shownBrowserNotificationIds.current.has(notification.id)) return;

      shownBrowserNotificationIds.current.add(notification.id);

      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: logo,
        tag: `hsgrowth-${notification.id}`, // Evita duplicatas no próprio browser
      });

      // Ao clicar na notificação do browser: foca a aba e navega para o link.
      // Usa window.location.href pois o handler é executado fora do contexto React.
      // Fallback para metadata.url em notificações antigas que têm link null.
      const destination = notification.link || notification.metadata?.url;
      browserNotification.onclick = () => {
        window.focus();
        if (destination) {
          window.location.href = destination;
        }
        browserNotification.close();
      };

      // Fecha automaticamente após 6 segundos
      setTimeout(() => browserNotification.close(), 6000);
    });
  }, [navigate]);

  // Função para carregar notificações (definida antes dos useEffects)
  const loadNotifications = useCallback(async (triggerBrowserNotification = false) => {
    setLoading(true);
    try {
      const response = await notificationService.list(1, 10, true); // Últimas 10 não lidas
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);

      // Dispara browser notifications apenas quando chamada por nova detecção de contagem
      if (triggerBrowserNotification) {
        showBrowserNotifications(response.notifications);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      // Mock de notificações para demonstração (filtra apenas não lidas)
      const mockData = getMockNotifications().filter(n => !n.is_read);
      setNotifications(mockData);
      setUnreadCount(mockData.length);
    } finally {
      setLoading(false);
    }
  }, [showBrowserNotifications]);

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
      // Nova notificação detectada — recarrega lista e dispara browser notifications
      loadNotifications(true);
    }
    setPreviousUnreadCount(unreadCount);
    // previousUnreadCount não é incluído nas dependências intencionalmente para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, loadNotifications]);

  // Sempre recarrega notificações quando abre o dropdown
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Erro ao carregar contador:", error);
      showError("Erro ao atualizar contador de notificações.");
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
      showError("Erro ao marcar notificação como lida.");
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
      showError("Erro ao marcar todas as notificações como lidas.");
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    // Marca como lida
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navega para o link — usa link direto ou fallback para metadata.url
    // (notificações antigas podem ter link null mas url dentro do metadata)
    const destination = notification.link || notification.metadata?.url;
    if (destination) {
      navigate(destination);
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
        className="relative rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-slate-900 dark:text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed left-4 right-4 top-16 z-[1000] flex max-h-[600px] flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-xl sm:left-auto sm:right-4 sm:w-96">
          {/* Header do Dropdown */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Notificações</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-400">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="rounded p-1.5 text-slate-400 dark:text-slate-400 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
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
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Ver todas
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-400">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 dark:text-slate-400">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-colors ${
                      (notification.link || notification.metadata?.url) ? "cursor-pointer hover:bg-gray-200/50 dark:hover:bg-slate-700/50" : ""
                    } ${!notification.is_read ? "bg-gray-200/30 dark:bg-slate-700/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className={`flex-shrink-0 ${notificationService.getTypeColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Conteúdo */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${notification.is_read ? "text-slate-600 dark:text-slate-300" : "font-medium text-slate-900 dark:text-white"}`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 dark:text-slate-400">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
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
                          className="flex-shrink-0 rounded p-1 text-slate-400 dark:text-slate-400 transition-colors hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white"
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
const getMockNotifications = (): AppNotification[] => {
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
