import React, { useState, useEffect } from "react";
import { User, Bell, Save, Upload, Shield, Monitor, Clock, Activity, Settings as SettingsIcon, Award, Plus, Edit2, Trash2, Power, PowerOff, Search, Coins, CheckCircle, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import gamificationService, { Badge, ActionPoints } from "../services/gamificationService";
import BadgeModal, { BadgeFormData } from "../components/settings/BadgeModal";
import AwardBadgeModal from "../components/settings/AwardBadgeModal";

type Tab = "profile" | "notifications" | "security" | "badges" | "points";

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(false);

  // Estados do Perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Estados das Notificações
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    cardAssigned: true,
    transferReceived: true,
    transferApproved: true,
    cardWon: true,
    badgeEarned: true,
    automationFailed: true,
    doNotDisturbStart: "22:00",
    doNotDisturbEnd: "08:00",
  });

  // Estados das Badges (Admin)
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filteredBadges, setFilteredBadges] = useState<Badge[]>([]);
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<"all" | "active" | "inactive">("all");
  const [badgeTypeFilter, setBadgeTypeFilter] = useState<"all" | "manual" | "automatic">("all");
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [badgeModalMode, setBadgeModalMode] = useState<"create" | "edit">("create");
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [isAwardBadgeModalOpen, setIsAwardBadgeModalOpen] = useState(false);
  const [salespeople, setSalespeople] = useState<User[]>([]);

  // Estados das Configurações de Pontos (Admin)
  const [actionPoints, setActionPoints] = useState<ActionPoints[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [editingPoints, setEditingPoints] = useState<Record<string, number>>({});

  // Mock de usuários ativos no sistema (online)
  const [activeUsers] = useState([
    {
      id: 1,
      name: "João Silva",
      email: "joao@hsgrowth.com",
      role: "Admin",
      status: "online",
      lastActivity: "Agora",
      device: "Chrome - Windows",
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@hsgrowth.com",
      role: "Vendedor",
      status: "online",
      lastActivity: "há 5 minutos",
      device: "Firefox - MacOS",
    },
    {
      id: 3,
      name: "Pedro Costa",
      email: "pedro@hsgrowth.com",
      role: "Gerente",
      status: "away",
      lastActivity: "há 15 minutos",
      device: "Chrome - Linux",
    },
    {
      id: user?.id || 999,
      name: user?.name || "Você",
      email: user?.email || "",
      role: user?.role_name || "Usuário",
      status: "online",
      lastActivity: "Agora",
      device: "Chrome - Windows",
    },
  ]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Carrega badges quando a tab badges é ativada (admin ou gerente)
  useEffect(() => {
    const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
    if (activeTab === "badges" && isManagerOrAdmin) {
      loadBadges();
    }
  }, [activeTab, user]);

  // Carrega pontos quando a tab points é ativada (apenas admin)
  useEffect(() => {
    if (activeTab === "points" && user?.role === "admin") {
      loadActionPoints();
    }
  }, [activeTab, user]);

  // Filtra badges quando mudam os filtros ou a busca
  useEffect(() => {
    let filtered = [...badges];

    // Filtro por status
    if (badgeFilter === "active") {
      filtered = filtered.filter((b) => b.is_active);
    } else if (badgeFilter === "inactive") {
      filtered = filtered.filter((b) => !b.is_active);
    }

    // Filtro por tipo
    if (badgeTypeFilter === "manual") {
      filtered = filtered.filter((b) => b.criteria_type === "manual");
    } else if (badgeTypeFilter === "automatic") {
      filtered = filtered.filter((b) => b.criteria_type === "automatic");
    }

    // Busca por nome ou descrição
    if (badgeSearch.trim()) {
      const search = badgeSearch.toLowerCase();
      filtered = filtered.filter(
        (b) => b.name.toLowerCase().includes(search) || b.description.toLowerCase().includes(search)
      );
    }

    setFilteredBadges(filtered);
  }, [badges, badgeFilter, badgeTypeFilter, badgeSearch]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Atualiza o perfil no backend
      const updatedUser = await userService.update(user.id, {
        name: profileData.name,
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
      });

      // Atualiza o contexto de autenticação
      updateUser(updatedUser);

      alert("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      alert(error.response?.data?.detail || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    // TODO: Salvar notificações no backend (endpoint não existe ainda)
    alert("Preferências de notificações salvas com sucesso! (Mock)");
    console.log("Notificações:", notificationSettings);
  };

  // Funções para gerenciar badges (Admin)
  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const data = await gamificationService.getAllBadges();
      setBadges(data);

      // Carrega vendedores para o modal de atribuir badges
      if (isManagerOrAdmin) {
        const users = await userService.listActive();
        setSalespeople(users.filter(u => u.role === "salesperson"));
      }
    } catch (error) {
      console.error("Erro ao carregar badges:", error);
      alert("Erro ao carregar badges");
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleCreateBadge = () => {
    setBadgeModalMode("create");
    setSelectedBadge(null);
    setIsBadgeModalOpen(true);
  };

  const handleEditBadge = (badge: Badge) => {
    setBadgeModalMode("edit");
    setSelectedBadge(badge);
    setIsBadgeModalOpen(true);
  };

  const handleSaveBadge = async (badgeData: BadgeFormData) => {
    try {
      if (badgeModalMode === "create") {
        await gamificationService.createBadge(badgeData);
        alert("Badge criada com sucesso!");
      } else if (selectedBadge) {
        await gamificationService.updateBadge(selectedBadge.id, badgeData);
        alert("Badge atualizada com sucesso!");
      }
      await loadBadges();
      setIsBadgeModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar badge:", error);
      throw error; // Propaga erro para o modal tratar
    }
  };

  const handleToggleBadgeStatus = async (badge: Badge) => {
    try {
      await gamificationService.updateBadge(badge.id, {
        is_active: !badge.is_active,
      });
      alert(`Badge ${!badge.is_active ? "ativada" : "desativada"} com sucesso!`);
      await loadBadges();
    } catch (error) {
      console.error("Erro ao alterar status da badge:", error);
      alert("Erro ao alterar status da badge");
    }
  };

  const handleDeleteBadge = async (badge: Badge) => {
    if (!window.confirm(`Tem certeza que deseja deletar a badge "${badge.name}"?`)) {
      return;
    }

    try {
      await gamificationService.deleteBadge(badge.id);
      alert("Badge deletada com sucesso!");
      await loadBadges();
    } catch (error) {
      console.error("Erro ao deletar badge:", error);
      alert("Erro ao deletar badge");
    }
  };

  const handleOpenAwardBadge = () => {
    setIsAwardBadgeModalOpen(true);
  };

  const handleAwardBadge = async (badgeId: number, userIds: number[]) => {
    try {
      // Atribui badge para cada usuário selecionado
      const promises = userIds.map(userId =>
        gamificationService.awardBadge(badgeId, userId)
      );

      await Promise.all(promises);

      const badgeName = badges.find(b => b.id === badgeId)?.name || "Badge";
      const usersCount = userIds.length;

      alert(`Badge "${badgeName}" atribuída com sucesso a ${usersCount} vendedor(es)!`);
    } catch (error: any) {
      console.error("Erro ao atribuir badge:", error);
      throw error; // Propaga erro para o modal tratar
    }
  };

  // Funções para gerenciar pontos (Admin)
  const loadActionPoints = async () => {
    try {
      setLoadingPoints(true);
      const data = await gamificationService.listActionPoints();
      setActionPoints(data);
      // Inicializa valores de edição
      const initialEditing: Record<string, number> = {};
      data.forEach(action => {
        initialEditing[action.action_type] = action.points;
      });
      setEditingPoints(initialEditing);
    } catch (error) {
      console.error("Erro ao carregar pontos:", error);
      alert("Erro ao carregar configurações de pontos");
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleUpdatePoints = async (actionType: string) => {
    try {
      const newPoints = editingPoints[actionType];
      if (newPoints === undefined) return;

      await gamificationService.updateActionPoints(actionType, { points: newPoints });
      alert("Pontos atualizados com sucesso!");
      await loadActionPoints();
    } catch (error) {
      console.error("Erro ao atualizar pontos:", error);
      alert("Erro ao atualizar pontos");
    }
  };

  const handleToggleActionStatus = async (action: ActionPoints) => {
    try {
      await gamificationService.updateActionPoints(action.action_type, {
        is_active: !action.is_active,
      });
      alert(`Ação ${!action.is_active ? "ativada" : "desativada"} com sucesso!`);
      await loadActionPoints();
    } catch (error) {
      console.error("Erro ao alterar status da ação:", error);
      alert("Erro ao alterar status da ação");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Tabs - adiciona "Badges" e "Pontos" para admin/gerente
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profile" as Tab, label: "Perfil", icon: User },
    { id: "notifications" as Tab, label: "Notificações", icon: Bell },
    { id: "security" as Tab, label: "Segurança", icon: Shield },
  ];

  // Adiciona tab Badges para admin e gerente
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  if (isManagerOrAdmin) {
    tabs.push({ id: "badges" as Tab, label: "Badges", icon: Award });
  }

  // Adiciona tab Pontos apenas para admin
  if (user?.role === "admin") {
    tabs.push({ id: "points" as Tab, label: "Pontos", icon: Coins });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="text-white" size={32} />
          Configurações
        </h1>
        <p className="text-slate-400">Gerencie suas informações pessoais e preferências</p>
      </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon size={20} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-8">
            {/* Tab: Perfil */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Informações do Perfil</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                      {user?.name ? getInitials(user.name) : "?"}
                    </div>
                    <button
                      className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white transition-colors"
                      title="Upload de avatar (não implementado)"
                      onClick={() => alert("Upload de avatar será implementado no futuro")}
                    >
                      <Upload size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
                    <p className="text-slate-400">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 text-sm font-medium rounded-full">
                      {user?.role_name || "Usuário"}
                    </span>
                  </div>
                </div>

                {/* Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Seu username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Role (Função)
                    </label>
                    <input
                      type="text"
                      value={user?.role_name || ""}
                      disabled
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                      placeholder="Sua função"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Apenas administradores podem alterar funções
                    </p>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    <Save size={20} />
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Notificações */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Notificações</h2>

                {/* Canais de Notificação */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Canais de Notificação</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Notificações por Email</p>
                        <p className="text-sm text-slate-400">
                          Receber notificações importantes por email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Notificações Push</p>
                        <p className="text-sm text-slate-400">
                          Receber notificações no navegador
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Notificações no App</p>
                        <p className="text-sm text-slate-400">
                          Mostrar notificações dentro do sistema
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.inAppNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            inAppNotifications: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Tipos de Notificação */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Tipos de Notificação</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Card Atribuído a Mim</p>
                        <p className="text-sm text-slate-400">
                          Quando um card for atribuído para você
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.cardAssigned}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            cardAssigned: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Transferência Recebida</p>
                        <p className="text-sm text-slate-400">
                          Quando você receber uma transferência de card
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.transferReceived}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            transferReceived: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Transferência Aprovada/Rejeitada</p>
                        <p className="text-sm text-slate-400">
                          Quando sua transferência for aprovada ou rejeitada
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.transferApproved}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            transferApproved: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Card Ganho pela Equipe</p>
                        <p className="text-sm text-slate-400">
                          Quando um card for marcado como ganho
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.cardWon}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            cardWon: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Badge Conquistado</p>
                        <p className="text-sm text-slate-400">
                          Quando você conquistar um novo badge
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.badgeEarned}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            badgeEarned: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <p className="font-medium text-white">Automação Falhou</p>
                        <p className="text-sm text-slate-400">
                          Quando uma automação apresentar erro
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.automationFailed}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            automationFailed: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Não Perturbe */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Não Perturbe</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Defina um horário em que você não deseja receber notificações
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Início
                      </label>
                      <input
                        type="time"
                        value={notificationSettings.doNotDisturbStart}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            doNotDisturbStart: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={notificationSettings.doNotDisturbEnd}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            doNotDisturbEnd: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Save size={20} />
                    Salvar Preferências
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Segurança */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Usuários Ativos</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Controle de acesso - Veja quem está logado no sistema
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <Activity size={16} className="text-green-400" />
                    <span className="text-sm font-medium text-green-400">
                      {activeUsers.filter((u) => u.status === "online").length} Online
                    </span>
                  </div>
                </div>

                {/* Lista de Usuários Ativos */}
                <div className="space-y-3">
                  {activeUsers.map((activeUser) => (
                    <div
                      key={activeUser.id}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700/70 transition-colors"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                              {getInitials(activeUser.name)}
                            </div>
                            {/* Status Indicator */}
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-700 ${
                                activeUser.status === "online"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }`}
                              title={
                                activeUser.status === "online" ? "Online" : "Ausente"
                              }
                            />
                          </div>

                          {/* Info do Usuário */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white truncate">{activeUser.name}</p>
                              {activeUser.id === user?.id && (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 truncate">{activeUser.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded">
                                {activeUser.role}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Monitor size={12} />
                                <span className="truncate">{activeUser.device}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status e Última Atividade */}
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1">
                            <Clock size={14} />
                            <span className="truncate">{activeUser.lastActivity}</span>
                          </div>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              activeUser.status === "online"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {activeUser.status === "online" ? "Online" : "Ausente"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Informação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Shield size={16} />
                    Como funciona
                  </h4>
                  <p className="text-sm text-slate-300">
                    Os usuários são considerados <strong>Online</strong> quando estão ativos no
                    sistema. Após 15 minutos de inatividade, o status muda para{" "}
                    <strong>Ausente</strong>. As sessões são gerenciadas automaticamente via
                    Redis.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Badges (Admin e Gerente) */}
            {activeTab === "badges" && isManagerOrAdmin && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Gerenciar Badges</h2>
                    <p className="text-slate-400 text-sm">
                      Crie e gerencie badges customizadas do sistema de gamificação
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleOpenAwardBadge}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <UserPlus size={20} />
                      <span>Atribuir Badge</span>
                    </button>
                    <button
                      onClick={handleCreateBadge}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      <Plus size={20} />
                      <span>Nova Badge</span>
                    </button>
                  </div>
                </div>

                {/* Filtros e Busca */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={badgeSearch}
                      onChange={(e) => setBadgeSearch(e.target.value)}
                      placeholder="Buscar por nome ou descrição..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Filtro por Status */}
                  <select
                    value={badgeFilter}
                    onChange={(e) => setBadgeFilter(e.target.value as any)}
                    className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Apenas Ativas</option>
                    <option value="inactive">Apenas Inativas</option>
                  </select>

                  {/* Filtro por Tipo */}
                  <select
                    value={badgeTypeFilter}
                    onChange={(e) => setBadgeTypeFilter(e.target.value as any)}
                    className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="manual">Apenas Manuais</option>
                    <option value="automatic">Apenas Automáticas</option>
                  </select>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Total de Badges</p>
                    <p className="text-2xl font-bold text-white">{badges.length}</p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Ativas</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {badges.filter((b) => b.is_active).length}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Manuais</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {badges.filter((b) => b.criteria_type === "manual").length}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Automáticas</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {badges.filter((b) => b.criteria_type === "automatic").length}
                    </p>
                  </div>
                </div>

                {/* Lista de Badges */}
                {loadingBadges ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                    <p className="text-slate-400 mt-4">Carregando badges...</p>
                  </div>
                ) : filteredBadges.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="mx-auto text-slate-600 mb-4" size={64} />
                    <p className="text-slate-400 text-lg font-medium mb-2">
                      {badges.length === 0 ? "Nenhuma badge cadastrada" : "Nenhuma badge encontrada"}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {badges.length === 0
                        ? "Clique em 'Nova Badge' para criar a primeira badge"
                        : "Tente ajustar os filtros de busca"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`p-5 bg-slate-900 border rounded-lg transition-all hover:border-emerald-500/50 ${
                          badge.is_active ? "border-slate-700" : "border-slate-800 opacity-60"
                        }`}
                      >
                        {/* Header do Card */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl">{badge.icon_url || "🏆"}</span>
                            <div>
                              <h3 className="font-semibold text-white">{badge.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    badge.criteria_type === "manual"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-purple-500/20 text-purple-400"
                                  }`}
                                >
                                  {badge.criteria_type === "manual" ? "Manual" : "Automático"}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    badge.is_active
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-slate-500/20 text-slate-400"
                                  }`}
                                >
                                  {badge.is_active ? "Ativa" : "Inativa"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Descrição */}
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{badge.description}</p>

                        {/* Critérios (se automático) */}
                        {badge.criteria_type === "automatic" && badge.criteria && (
                          <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Regra:</p>
                            <p className="text-sm text-slate-300">
                              {badge.criteria.field} {badge.criteria.operator} {badge.criteria.value}
                            </p>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBadge(badge)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
                            title="Editar badge"
                          >
                            <Edit2 size={16} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleToggleBadgeStatus(badge)}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                              badge.is_active
                                ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400"
                                : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                            }`}
                            title={badge.is_active ? "Desativar badge" : "Ativar badge"}
                          >
                            {badge.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            onClick={() => handleDeleteBadge(badge)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
                            title="Deletar badge"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Informação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Award size={16} />
                    Como funcionam as badges
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>
                      • <strong>Manuais:</strong> Admin atribui manualmente a vendedores específicos
                    </li>
                    <li>
                      • <strong>Automáticas:</strong> Sistema concede automaticamente quando critério é
                      atingido
                    </li>
                    <li>• Badges desativadas não são concedidas, mas histórico é mantido</li>
                    <li>• Cada vendedor pode conquistar uma badge apenas uma vez</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab: Pontos (Admin Only) */}
            {activeTab === "points" && user?.role === "admin" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Configurar Pontos</h2>
                    <p className="text-slate-400 text-sm">
                      Defina quantos pontos vale cada ação no sistema de gamificação
                    </p>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Total de Ações</p>
                    <p className="text-2xl font-bold text-white">{actionPoints.length}</p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Ações Ativas</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {actionPoints.filter((a) => a.is_active).length}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Pontos Médios</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {actionPoints.length > 0
                        ? Math.round(
                            actionPoints.reduce((sum, a) => sum + a.points, 0) / actionPoints.length
                          )
                        : 0}
                    </p>
                  </div>
                </div>

                {/* Lista de Ações */}
                {loadingPoints ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                    <p className="text-slate-400 mt-4">Carregando configurações...</p>
                  </div>
                ) : actionPoints.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="mx-auto text-slate-600 mb-4" size={64} />
                    <p className="text-slate-400 text-lg font-medium mb-2">Nenhuma configuração encontrada</p>
                    <p className="text-slate-500 text-sm">
                      As configurações padrão serão criadas automaticamente
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Ação
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Descrição
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Pontos
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {actionPoints.map((action) => (
                            <tr key={action.id} className="hover:bg-slate-800/50 transition-colors">
                              {/* Tipo de Ação */}
                              <td className="px-6 py-4">
                                <code className="text-sm text-cyan-400 bg-slate-800 px-2 py-1 rounded">
                                  {action.action_type}
                                </code>
                              </td>

                              {/* Descrição */}
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-300">{action.description || "-"}</p>
                              </td>

                              {/* Pontos (editável) */}
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={editingPoints[action.action_type] || 0}
                                    onChange={(e) =>
                                      setEditingPoints({
                                        ...editingPoints,
                                        [action.action_type]: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-20 px-3 py-1 bg-slate-800 border border-slate-700 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                  {editingPoints[action.action_type] !== action.points && (
                                    <button
                                      onClick={() => handleUpdatePoints(action.action_type)}
                                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                      title="Salvar alteração"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                    action.is_active
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-slate-500/20 text-slate-400"
                                  }`}
                                >
                                  {action.is_active ? "Ativa" : "Inativa"}
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleToggleActionStatus(action)}
                                    className={`p-2 rounded transition-colors ${
                                      action.is_active
                                        ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400"
                                        : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                                    }`}
                                    title={action.is_active ? "Desativar ação" : "Ativar ação"}
                                  >
                                    {action.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Informação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Coins size={16} />
                    Como funciona
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Cada ação no sistema pode gerar pontos para o usuário</li>
                    <li>• Valores negativos funcionam como penalidades (ex: card_lost = -5 pts)</li>
                    <li>• Ações desativadas não geram pontos, mas ficam salvas no sistema</li>
                    <li>
                      • Alterações afetam apenas ações futuras (não são retroativas)
                    </li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal de Badge */}
        <BadgeModal
          isOpen={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          onSave={handleSaveBadge}
          badge={selectedBadge}
          mode={badgeModalMode}
        />

        {/* Modal de Atribuir Badge */}
        <AwardBadgeModal
          isOpen={isAwardBadgeModalOpen}
          onClose={() => setIsAwardBadgeModalOpen(false)}
          onAward={handleAwardBadge}
          badges={badges.filter(b => b.criteria_type === "manual" && b.is_active)}
          users={salespeople}
        />
    </div>
  );
};

export default Settings;
