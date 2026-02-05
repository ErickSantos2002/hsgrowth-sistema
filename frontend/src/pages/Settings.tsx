import React, { useState, useEffect, useRef } from "react";
import { User, Bell, Save, Upload, Shield, Monitor, Clock, Activity, Settings as SettingsIcon, Award, Plus, Edit2, Trash2, Power, PowerOff, Search, Coins, CheckCircle, UserPlus, ChevronDown, Phone, Globe, FileText, Filter, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import authService from "../services/authService";
import gamificationService, { Badge, ActionPoints } from "../services/gamificationService";
import BadgeModal, { BadgeFormData } from "../components/settings/BadgeModal";
import AwardBadgeModal from "../components/settings/AwardBadgeModal";
import api4comService, { API4ComConfig, UserExtension, API4ComConfigCreate, UserExtensionCreate } from "../services/api4comService";
import auditLogService, { AuditLog } from "../services/auditLogService";
import { toast } from "react-hot-toast";

type Tab = "profile" | "notifications" | "security" | "badges" | "points" | "api4com" | "logs";

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

  // Estados da API4COM (Admin)
  const [api4comConfig, setApi4comConfig] = useState<API4ComConfig | null>(null);
  const [loadingApi4comConfig, setLoadingApi4comConfig] = useState(false);
  const [savingApi4comConfig, setSavingApi4comConfig] = useState(false);
  const [testingApi4comConnection, setTestingApi4comConnection] = useState(false);
  const [api4comExtensions, setApi4comExtensions] = useState<UserExtension[]>([]);
  const [loadingApi4comExtensions, setLoadingApi4comExtensions] = useState(false);
  const [savingApi4comExtension, setSavingApi4comExtension] = useState(false);
  const [showApi4comConfigForm, setShowApi4comConfigForm] = useState(false);
  const [api4comConfigForm, setApi4comConfigForm] = useState<API4ComConfigCreate>({
    email: '',
    password: '',
  });
  const [api4comExtensionForm, setApi4comExtensionForm] = useState<UserExtensionCreate>({
    user_id: 0,
    extension: '',
  });
  const [editingApi4comExtension, setEditingApi4comExtension] = useState<UserExtension | null>(null);

  // Estados do Histórico de Logins
  const [loginHistory, setLoginHistory] = useState<Array<{
    id: number;
    user_name: string;
    user_email: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
  }>>([]);
  const [loadingLoginHistory, setLoadingLoginHistory] = useState(false);

  // Estados dos Logs de Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilters, setLogsFilters] = useState({
    action: "",
    entity_type: "",
    start_date: "",
    end_date: "",
  });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);

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

  // Carrega dados da API4COM quando a tab api4com é ativada (apenas admin)
  useEffect(() => {
    if (activeTab === "api4com" && user?.role === "admin") {
      loadApi4comConfig();
      loadApi4comExtensions();
    }
  }, [activeTab, user]);

  // Carrega logs de auditoria quando a tab logs é ativada (admin ou gerente)
  useEffect(() => {
    const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
    if (activeTab === "logs" && isManagerOrAdmin) {
      loadLogs();
      loadFilterOptions();
    }
  }, [activeTab, user, logsFilters]);

  // Carrega histórico de logins quando a tab security é ativada
  useEffect(() => {
    if (activeTab === "security") {
      loadLoginHistory();
    }
  }, [activeTab]);

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

  const handleInitializeActionPoints = async () => {
    if (!confirm("Deseja inicializar as configurações padrão de pontos? Isso irá criar as ações padrão do sistema.")) {
      return;
    }

    try {
      setLoadingPoints(true);
      await gamificationService.initializeActionPoints();
      toast.success("Configurações padrão inicializadas com sucesso!");
      await loadActionPoints();
    } catch (error) {
      console.error("Erro ao inicializar configurações:", error);
      toast.error("Erro ao inicializar configurações padrão");
    } finally {
      setLoadingPoints(false);
    }
  };

  // Função para carregar histórico de logins
  const loadLoginHistory = async () => {
    try {
      setLoadingLoginHistory(true);
      const data = await authService.getLoginHistory(20);
      setLoginHistory(data.logins);
    } catch (error) {
      console.error("Erro ao carregar histórico de logins:", error);
      toast.error("Erro ao carregar histórico de logins");
    } finally {
      setLoadingLoginHistory(false);
    }
  };

  // Funções para gerenciar logs de auditoria (Admin/Manager)
  const loadLogs = async () => {
    try {
      setLoadingLogs(true);

      // Busca 100 logs da API com os filtros aplicados
      const data = await auditLogService.getLogs({
        page: 1,
        page_size: 100,
        action: logsFilters.action || undefined,
        entity_type: logsFilters.entity_type || undefined,
        start_date: logsFilters.start_date || undefined,
        end_date: logsFilters.end_date || undefined,
      });

      setAuditLogs(data.logs);
      setLogsTotal(data.logs.length);
      // Calcula 5 páginas (20 registros por página)
      setLogsTotalPages(Math.ceil(data.logs.length / 20));
      setLogsPage(1); // Reseta para primeira página
    } catch (error) {
      console.error("Erro ao carregar logs de auditoria:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [actions, entityTypes] = await Promise.all([
        auditLogService.getActions(),
        auditLogService.getEntityTypes(),
      ]);
      setAvailableActions(actions);
      setAvailableEntityTypes(entityTypes);
    } catch (error) {
      console.error("Erro ao carregar opções de filtro:", error);
    }
  };

  const handleLogsFilterChange = (field: string, value: string) => {
    setLogsFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClearLogsFilters = () => {
    setLogsFilters({
      action: "",
      entity_type: "",
      start_date: "",
      end_date: "",
    });
  };

  // Funções para gerenciar API4COM (Admin)
  const loadApi4comConfig = async () => {
    try {
      setLoadingApi4comConfig(true);
      const data = await api4comService.getConfig();
      setApi4comConfig(data);
      setApi4comConfigForm({ email: data.email, password: '' });
      setShowApi4comConfigForm(false);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setShowApi4comConfigForm(true);
      } else {
        toast.error('Erro ao carregar configuração');
      }
    } finally {
      setLoadingApi4comConfig(false);
    }
  };

  const loadApi4comExtensions = async () => {
    try {
      setLoadingApi4comExtensions(true);
      const data = await api4comService.listExtensions();
      setApi4comExtensions(data);

      // Carrega vendedores para o formulário de vincular ramais
      const users = await userService.listActive();
      setSalespeople(users.filter(u => u.role === "salesperson"));
    } catch (error) {
      toast.error('Erro ao carregar ramais');
    } finally {
      setLoadingApi4comExtensions(false);
    }
  };

  const handleSaveApi4comConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api4comConfigForm.email || !api4comConfigForm.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSavingApi4comConfig(true);
    try {
      const data = await api4comService.saveConfig(api4comConfigForm);
      setApi4comConfig(data);
      setShowApi4comConfigForm(false);
      setApi4comConfigForm({ ...api4comConfigForm, password: '' });
      toast.success('Configuração salva e token obtido com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao salvar configuração';
      toast.error(message);
    } finally {
      setSavingApi4comConfig(false);
    }
  };

  const handleTestApi4comConnection = async () => {
    setTestingApi4comConnection(true);
    try {
      const result = await api4comService.testConnection();

      if (result.success) {
        toast.success(result.message);
        loadApi4comConfig();
      } else {
        toast.error(result.message + (result.error ? `: ${result.error}` : ''));
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao testar conexão';
      toast.error(message);
    } finally {
      setTestingApi4comConnection(false);
    }
  };

  const handleSaveApi4comExtension = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api4comExtensionForm.user_id || !api4comExtensionForm.extension) {
      toast.error('Selecione um vendedor e informe o ramal');
      return;
    }

    setSavingApi4comExtension(true);
    try {
      await api4comService.saveExtension(api4comExtensionForm);
      const message = editingApi4comExtension ? 'Ramal atualizado com sucesso!' : 'Ramal vinculado com sucesso!';
      toast.success(message);
      setApi4comExtensionForm({ user_id: 0, extension: '' });
      setEditingApi4comExtension(null);
      loadApi4comExtensions();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao vincular ramal';
      toast.error(message);
    } finally {
      setSavingApi4comExtension(false);
    }
  };

  const handleDeleteApi4comExtension = async (userId: number, userName: string) => {
    if (!confirm(`Deseja remover o ramal de ${userName}?`)) return;

    try {
      await api4comService.deleteExtension(userId);
      toast.success('Ramal removido com sucesso!');
      loadApi4comExtensions();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao remover ramal';
      toast.error(message);
    }
  };

  const handleEditApi4comExtension = (extension: UserExtension) => {
    setEditingApi4comExtension(extension);
    setApi4comExtensionForm({
      user_id: extension.user_id,
      extension: extension.extension,
    });
  };

  const handleCancelEditApi4comExtension = () => {
    setEditingApi4comExtension(null);
    setApi4comExtensionForm({ user_id: 0, extension: '' });
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
  ];

  // Adiciona tab Segurança apenas para admin e gerente
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  if (isManagerOrAdmin) {
    tabs.push({ id: "security" as Tab, label: "Segurança", icon: Shield });
  }

  // Adiciona tab Badges para admin e gerente
  if (isManagerOrAdmin) {
    tabs.push({ id: "badges" as Tab, label: "Badges", icon: Award });
  }

  // Adiciona tab Pontos apenas para admin
  if (user?.role === "admin") {
    tabs.push({ id: "points" as Tab, label: "Pontos", icon: Coins });
  }

  // Adiciona tab API4COM apenas para admin
  if (user?.role === "admin") {
    tabs.push({ id: "api4com" as Tab, label: "API4COM", icon: Phone });
  }

  // Adiciona tab Logs de Auditoria para admin e gerente
  if (isManagerOrAdmin) {
    tabs.push({ id: "logs" as Tab, label: "Logs de Auditoria", icon: FileText });
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
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
                    <p className="text-slate-400 text-sm sm:text-base max-w-[180px] sm:max-w-none truncate">
                      {user?.email}
                    </p>
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
                      disabled={user?.role === "salesperson"}
                      className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        user?.role === "salesperson" ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      placeholder="seu@email.com"
                    />
                    {user?.role === "salesperson" && (
                      <p className="text-xs text-slate-500 mt-1">
                        Apenas administradores podem alterar o email
                      </p>
                    )}
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
                    <h2 className="text-xl font-semibold text-white">Histórico de Logins</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Acompanhe os acessos à sua conta para maior segurança
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      {loginHistory.length} logins registrados
                    </span>
                  </div>
                </div>

                {/* Lista de Histórico de Logins */}
                <div className="space-y-3">
                  {loadingLoginHistory ? (
                    // Loading state
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : loginHistory.length === 0 ? (
                    // Empty state
                    <div className="text-center py-12">
                      <Shield size={48} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-slate-400">Nenhum login registrado ainda</p>
                    </div>
                  ) : (
                    // Login history list
                    loginHistory.map((login) => {
                      // Parseia o user_agent para extrair informações
                      const getBrowserInfo = (userAgent: string) => {
                        const ua = userAgent.toLowerCase();

                        // Detecta browser
                        let browser = "Desconhecido";
                        if (ua.includes("edg")) browser = "Edge";
                        else if (ua.includes("chrome")) browser = "Chrome";
                        else if (ua.includes("firefox")) browser = "Firefox";
                        else if (ua.includes("safari")) browser = "Safari";
                        else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

                        // Detecta OS
                        let os = "Desconhecido";
                        if (ua.includes("windows")) os = "Windows";
                        else if (ua.includes("mac")) os = "macOS";
                        else if (ua.includes("linux")) os = "Linux";
                        else if (ua.includes("android")) os = "Android";
                        else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

                        // Detecta tipo de dispositivo
                        let deviceType = "Desktop";
                        if (ua.includes("mobile")) deviceType = "Mobile";
                        else if (ua.includes("tablet")) deviceType = "Tablet";

                        return { browser, os, deviceType };
                      };

                      // Formata a data
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        if (diffMins < 1) return "Agora";
                        if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
                        if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                        if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

                        return date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };

                      const { browser, os, deviceType } = getBrowserInfo(login.user_agent);

                      return (
                        <div
                          key={login.id}
                          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700/70 transition-colors"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              {/* Ícone do dispositivo */}
                              <div className="mt-1">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <Monitor size={20} className="text-blue-400" />
                                </div>
                              </div>

                              {/* Informações do login */}
                              <div className="min-w-0 flex-1">
                                {/* Nome do usuário e horário */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <p className="font-semibold text-white text-base">{login.user_name}</p>
                                  <div className="flex items-center gap-1.5 text-sm text-slate-300 bg-slate-800 px-2 py-1 rounded">
                                    <Clock size={14} />
                                    <span className="font-medium">{formatDate(login.created_at)}</span>
                                  </div>
                                </div>

                                {/* Browser e OS */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-sm text-slate-400">{browser}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-sm text-slate-400">{os}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-sm text-slate-400">{deviceType}</span>
                                </div>

                                {/* IP Address */}
                                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                  <Globe size={14} />
                                  <span className="truncate">{login.ip_address}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Informação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Shield size={16} />
                    Sobre o Histórico de Logins
                  </h4>
                  <p className="text-sm text-slate-300">
                    Cada login realizado no sistema é registrado com informações de{" "}
                    <strong>endereço IP</strong>, <strong>dispositivo</strong> e{" "}
                    <strong>navegador</strong> utilizado. Isso permite auditar acessos e identificar
                    atividades suspeitas. Os registros são mantidos permanentemente para fins de
                    segurança e conformidade.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Badges (Admin e Gerente) */}
            {activeTab === "badges" && isManagerOrAdmin && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Gerenciar Badges</h2>
                    <p className="text-slate-400 text-sm">
                      Crie e gerencie badges customizadas do sistema de gamificação
                    </p>
                  </div>
                  <div className="flex gap-3 md:justify-end">
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

                  {/* Filtro por Status */}                  <SelectMenu
                    value={badgeFilter}
                    options={[
                      { value: "all", label: "Todos os Status" },
                      { value: "active", label: "Apenas Ativas" },
                      { value: "inactive", label: "Apenas Inativas" },
                    ]}
                    onChange={(value) => setBadgeFilter(value as any)}
                  />
{/* Filtro por Tipo */}                  <SelectMenu
                    value={badgeTypeFilter}
                    options={[
                      { value: "all", label: "Todos os Tipos" },
                      { value: "manual", label: "Apenas Manuais" },
                      { value: "automatic", label: "Apenas Autom?ticas" },
                    ]}
                    onChange={(value) => setBadgeTypeFilter(value as any)}
                  />
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
                  {actionPoints.length === 0 && !loadingPoints && (
                    <button
                      onClick={handleInitializeActionPoints}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg hover:shadow-emerald-500/50"
                    >
                      <Plus size={20} />
                      Inicializar Configurações Padrão
                    </button>
                  )}
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

            {/* Tab: API4COM (Admin Only) */}
            {activeTab === "api4com" && user?.role === "admin" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Configurações API4COM (VOIP)</h2>
                    <p className="text-slate-400 text-sm">
                      Gerencie credenciais e ramais para integração com API4COM
                    </p>
                  </div>
                </div>

                {/* ========== Seção de Configuração ========== */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Credenciais da API4COM</h3>
                    {api4comConfig && !showApi4comConfigForm && (
                      <button
                        onClick={() => setShowApi4comConfigForm(true)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Alterar Credenciais
                      </button>
                    )}
                  </div>

                  {/* Status da Configuração */}
                  {api4comConfig && !showApi4comConfigForm && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Email:</span>
                          <p className="font-medium text-white">{api4comConfig.email}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Status:</span>
                          <p>
                            {api4comConfig.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                Inativo
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Token válido:</span>
                          <p>
                            {api4comConfig.has_valid_token ? (
                              <span className="text-green-400 font-medium">Sim</span>
                            ) : (
                              <span className="text-red-400 font-medium">Não</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Expira em:</span>
                          <p className="text-sm text-slate-300">
                            {api4comConfig.token_expires_at
                              ? new Date(api4comConfig.token_expires_at).toLocaleString('pt-BR')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {api4comConfig.last_test_at && (
                        <div className="border-t border-slate-700 pt-3">
                          <span className="text-sm text-slate-400">Último teste:</span>
                          <p className="text-sm text-slate-300">
                            {new Date(api4comConfig.last_test_at).toLocaleString('pt-BR')} -{' '}
                            {api4comConfig.last_test_success ? (
                              <span className="text-green-400">Sucesso</span>
                            ) : (
                              <span className="text-red-400">Falhou</span>
                            )}
                          </p>
                          {api4comConfig.last_test_error && (
                            <p className="text-sm text-red-400 mt-1">{api4comConfig.last_test_error}</p>
                          )}
                        </div>
                      )}

                      <div className="pt-3">
                        <button
                          onClick={handleTestApi4comConnection}
                          disabled={testingApi4comConnection}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testingApi4comConnection ? 'Testando...' : 'Testar Conexão'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formulário de Configuração */}
                  {showApi4comConfigForm && (
                    <form onSubmit={handleSaveApi4comConfig} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Email da API4COM
                        </label>
                        <input
                          type="email"
                          value={api4comConfigForm.email}
                          onChange={(e) => setApi4comConfigForm({ ...api4comConfigForm, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Senha da API4COM
                        </label>
                        <input
                          type="password"
                          value={api4comConfigForm.password}
                          onChange={(e) => setApi4comConfigForm({ ...api4comConfigForm, password: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Ao salvar, o sistema fará login e obterá o token automaticamente
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={savingApi4comConfig}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingApi4comConfig ? 'Salvando...' : 'Salvar e Obter Token'}
                        </button>
                        {api4comConfig && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowApi4comConfigForm(false);
                              setApi4comConfigForm({ email: api4comConfig.email, password: '' });
                            }}
                            className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* ========== Seção de Ramais ========== */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Ramais dos Vendedores</h3>

                  {/* Formulário para Adicionar/Editar Ramal */}
                  <form onSubmit={handleSaveApi4comExtension} className="mb-6 p-4 bg-slate-800 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">
                      {editingApi4comExtension ? 'Editar Ramal do Vendedor' : 'Vincular Vendedor ao Ramal'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Vendedor
                        </label>
                        <SelectMenu
                          value={api4comExtensionForm.user_id ? String(api4comExtensionForm.user_id) : ""}
                          options={salespeople.map((sp) => ({ value: String(sp.id), label: sp.name }))}
                          placeholder="Selecione..."
                          onChange={(value) =>
                            setApi4comExtensionForm({ ...api4comExtensionForm, user_id: Number(value) })
                          }
                          disabled={!!editingApi4comExtension}
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Ramal
                        </label>
                        <input
                          type="text"
                          value={api4comExtensionForm.extension}
                          onChange={(e) =>
                            setApi4comExtensionForm({ ...api4comExtensionForm, extension: e.target.value })
                          }
                          placeholder="Ex: 1000"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div className="col-span-1 flex flex-col sm:flex-row sm:items-end gap-2">
                        <button
                          type="submit"
                          disabled={savingApi4comExtension}
                          className="w-full sm:flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingApi4comExtension
                            ? 'Salvando...'
                            : editingApi4comExtension
                            ? 'Atualizar'
                            : 'Vincular'}
                        </button>
                        {editingApi4comExtension && (
                          <button
                            type="button"
                            onClick={handleCancelEditApi4comExtension}
                            className="w-full sm:w-auto px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Tabela de Ramais */}
                  {loadingApi4comExtensions ? (
                    <div className="text-center text-slate-400 py-8">Carregando ramais...</div>
                  ) : api4comExtensions.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      Nenhum ramal vinculado ainda
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Vendedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Ramal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {api4comExtensions.map((ext) => (
                            <tr key={ext.id} className="hover:bg-slate-800/50">
                              <td className="px-4 py-3 text-sm font-medium text-white">
                                {ext.user_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400">{ext.user_email}</td>
                              <td className="px-4 py-3 text-sm font-mono text-white">
                                {ext.extension}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {ext.is_active ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                                    Inativo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditApi4comExtension(ext)}
                                    className="p-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 transition-colors"
                                    title="Editar ramal"
                                    aria-label="Editar ramal"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApi4comExtension(ext.user_id, ext.user_name || '')}
                                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                                    title="Remover ramal"
                                    aria-label="Remover ramal"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Informação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Phone size={16} />
                    Como funciona
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Configure as credenciais da sua conta API4COM para obter o token de autenticação</li>
                    <li>• Vincule cada vendedor ao seu ramal físico existente no sistema VOIP</li>
                    <li>• O token é renovado automaticamente quando próximo da expiração</li>
                    <li>• Vendedores poderão fazer ligações diretamente do sistema (Fase 2)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab: Logs de Auditoria */}
            {activeTab === "logs" && isManagerOrAdmin && (
              <div className="space-y-6">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">Logs de Auditoria</h2>
                  <p className="text-slate-400 text-sm">
                    Visualize todas as ações realizadas no sistema pelos usuários
                  </p>
                </div>

                {/* Filtros */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Filter size={20} />
                    Filtros
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filtro por Ação */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ação
                      </label>
                      <select
                        value={logsFilters.action}
                        onChange={(e) => handleLogsFilterChange("action", e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Todas</option>
                        {availableActions.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Tipo de Entidade */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Tipo de Entidade
                      </label>
                      <select
                        value={logsFilters.entity_type}
                        onChange={(e) => handleLogsFilterChange("entity_type", e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Todas</option>
                        {availableEntityTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Data Inicial */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={logsFilters.start_date}
                        onChange={(e) => handleLogsFilterChange("start_date", e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Filtro por Data Final */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={logsFilters.end_date}
                        onChange={(e) => handleLogsFilterChange("end_date", e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleClearLogsFilters}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>

                {/* Tabela de Logs */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  {loadingLogs ? (
                    <div className="p-8 text-center text-slate-400">
                      Carregando logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Nenhum log encontrado
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-800 border-b border-slate-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Data/Hora
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Usuário
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Ação
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Entidade
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Descrição
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                IP
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {auditLogs
                              .slice((logsPage - 1) * 20, logsPage * 20)
                              .map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/50">
                                  <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString("pt-BR")}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-300">
                                    <div>
                                      <div className="font-medium">{log.user_name}</div>
                                      {log.user_email && (
                                        <div className="text-xs text-slate-400">{log.user_email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                      {log.action}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-300">
                                    {log.entity_type}
                                    {log.entity_id && (
                                      <span className="text-slate-500"> #{log.entity_id}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-300">
                                    {log.description}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                    {log.ip_address}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginação */}
                      {logsTotalPages > 1 && (
                        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                          <div className="text-sm text-slate-400">
                            Mostrando {(logsPage - 1) * 20 + 1} a {Math.min(logsPage * 20, logsTotal)} de {logsTotal} logs
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                              disabled={logsPage === 1}
                              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Anterior
                            </button>
                            <div className="flex items-center gap-2">
                              {Array.from({ length: logsTotalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => setLogsPage(page)}
                                  className={`px-3 py-2 rounded-lg ${
                                    logsPage === page
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                              disabled={logsPage === logsTotalPages}
                              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Próxima
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${
                option.value === value ? "bg-slate-800/70" : ""
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Settings;
