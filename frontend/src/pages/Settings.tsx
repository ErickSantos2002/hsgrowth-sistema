import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { User as UserIcon, Bell, Save, Upload, Shield, Monitor, Clock, Activity, Settings as SettingsIcon, Award, Plus, Edit2, Trash2, Power, PowerOff, Search, Coins, CheckCircle, UserPlus, ChevronDown, Phone, Globe, FileText, Filter, Calendar, RefreshCw, Wifi, Mail, X, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import authService from "../services/authService";
import gamificationService, { Badge, ActionPoints } from "../services/gamificationService";
import BadgeModal, { BadgeFormData } from "../components/settings/BadgeModal";
import AwardBadgeModal from "../components/settings/AwardBadgeModal";
import api4comService, { API4ComConfig, UserExtension, API4ComConfigCreate, UserExtensionCreate } from "../services/api4comService";
import auditLogService, { AuditLog } from "../services/auditLogService";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import type { User, OnlineUser } from "../types";
import { LoadingSpinner } from "../components/common";
import avatarService from "../services/avatarService";
import emailTemplateService, { EmailTemplate } from "../services/emailTemplateService";

type Tab = "profile" | "notifications" | "security" | "badges" | "points" | "api4com" | "logs" | "email_templates";

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(false);

  // Estados do Perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    email_signature: user?.email_signature || "",
  });
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [signatureText, setSignatureText] = useState(
    user?.email_signature
      ? (user.email_signature.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]?.replace(/<br\s*\/?>/g, "\n") || ""
      : ""
  );
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(
    // Extrai o src da imagem do HTML salvo (pode ser data URL ou URL de servidor)
    user?.email_signature
      ? (user.email_signature.match(/src="([^"]+)"/) || [])[1] || null
      : null
  );
  const [uploadingSignatureImage, setUploadingSignatureImage] = useState(false);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);

  // Estados do Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
  const [loginPage, setLoginPage] = useState(1);

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

  // Estados das Sessões Ativas (Redis)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(false);

  // Estados dos Logs de Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  /** Controla se o usuário já realizou pelo menos uma pesquisa. Enquanto false, exibe placeholder. */
  const [logsSearched, setLogsSearched] = useState(false);
  /** IDs das linhas de log com a linha de detalhes expandida. */
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [logsFilters, setLogsFilters] = useState({
    action: "",
    entity_type: "",
    user_id: "",
    start_date: "",
    end_date: "",
  });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);
  const [availableLogUsers, setAvailableLogUsers] = useState<{ id: number; name: string }[]>([]);

  // Estados de templates de e-mail
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "", is_active: true });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const savingTemplateRef = useRef(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        email_signature: user.email_signature || "",
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

  useEffect(() => {
    if (activeTab === "security") {
      setLoginPage(1);
    }
  }, [activeTab, loginHistory.length]);

  // Carrega dados da API4COM quando a tab api4com é ativada (apenas admin)
  useEffect(() => {
    if (activeTab === "api4com" && user?.role === "admin") {
      loadApi4comConfig();
      loadApi4comExtensions();
    }
  }, [activeTab, user]);

  // Carrega opções de filtro quando a tab logs é ativada (admin ou gerente).
  // Não carrega os logs automaticamente — o usuário precisa clicar em "Pesquisar".
  useEffect(() => {
    const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
    if (activeTab === "logs" && isManagerOrAdmin) {
      loadFilterOptions();
      // Reseta o estado de pesquisa ao trocar de tab
      setLogsSearched(false);
      setAuditLogs([]);
    }
  }, [activeTab, user]);

  // Carrega templates quando a tab email_templates é ativada
  useEffect(() => {
    const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
    if (activeTab === "email_templates" && isManagerOrAdmin) {
      loadEmailTemplates();
    }
  }, [activeTab, user]);

  // Gera o HTML da assinatura a partir do texto + URL da imagem
  const buildSignatureHtml = (text: string, imageUrl: string | null): string => {
    const textHtml = text.trim()
      ? `<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;color:#333;">${text.trim().replace(/\n/g, "<br>")}</p>`
      : "";
    const imgHtml = imageUrl
      ? `<img src="${imageUrl}" style="max-width:600px;height:auto;display:block;" />`
      : "";
    return textHtml + imgHtml;
  };

  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showError("Imagem muito grande. Máximo 5 MB.");
      e.target.value = "";
      return;
    }

    setUploadingSignatureImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignatureImageUrl(dataUrl);
      const newHtml = buildSignatureHtml(signatureText, dataUrl);
      setProfileData(p => ({ ...p, email_signature: newHtml }));
      setUploadingSignatureImage(false);
    };
    reader.onerror = () => {
      showError("Erro ao ler a imagem.");
      setUploadingSignatureImage(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Sincroniza HTML sempre que texto ou imagem mudam
  const handleSignatureTextChange = (text: string) => {
    setSignatureText(text);
    setProfileData(p => ({ ...p, email_signature: buildSignatureHtml(text, signatureImageUrl) }));
  };

  const loadEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await emailTemplateService.list(true);
      setEmailTemplates(data);
    } catch {
      showError("Erro ao carregar templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: "", subject: "", body: "", is_active: true });
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (tpl: EmailTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, is_active: tpl.is_active });
    setTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    if (savingTemplateRef.current) return;
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      showError("Preencha todos os campos obrigatórios");
      return;
    }
    savingTemplateRef.current = true;
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        await emailTemplateService.update(editingTemplate.id, templateForm);
        showSuccess("Template atualizado");
      } else {
        await emailTemplateService.create(templateForm);
        showSuccess("Template criado");
      }
      setTemplateModalOpen(false);
      loadEmailTemplates();
    } catch {
      showError("Erro ao salvar template");
    } finally {
      savingTemplateRef.current = false;
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (tpl: EmailTemplate) => {
    const confirmed = await confirm({ title: "Excluir template", message: `Excluir o template "${tpl.name}"?` });
    if (!confirmed) return;
    try {
      await emailTemplateService.delete(tpl.id);
      showSuccess("Template excluído");
      loadEmailTemplates();
    } catch {
      showError("Erro ao excluir template");
    }
  };

  // Carrega histórico de logins e sessões ativas quando a tab security é ativada
  useEffect(() => {
    if (activeTab === "security") {
      loadLoginHistory();
      // Sessões ativas só disponíveis para admin/manager
      if (user?.role === "admin" || user?.role === "manager") {
        loadOnlineUsers();
      }
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
        (b) => b.name.toLowerCase().includes(search) || (b.description || "").toLowerCase().includes(search)
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
        email_signature: profileData.email_signature || null,
      });

      // Atualiza o contexto de autenticação
      updateUser(updatedUser);

      showSuccess("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      showError(error.response?.data?.detail || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manipula seleção de arquivo de avatar
   */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validation = avatarService.validateAvatar(file);
    if (!validation.valid) {
      showWarning(validation.error || "Arquivo inválido");
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setAvatarFile(file);
  };

  /**
   * Faz upload do avatar
   */
  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;

    try {
      setUploadingAvatar(true);
      const response = await avatarService.uploadAvatar(avatarFile);

      // Atualiza o contexto de autenticação com novo avatar_url
      const updatedUser = { ...user, avatar_url: response.avatar_url };
      updateUser(updatedUser);

      showSuccess("Avatar atualizado com sucesso!");
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      console.error("Erro ao fazer upload de avatar:", error);
      showError(error.response?.data?.detail || "Erro ao fazer upload do avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * Cancela seleção de novo avatar (apenas limpa preview)
   */
  const handleCancelAvatarChange = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  /**
   * Remove avatar do servidor
   */
  const handleDeleteAvatar = async () => {
    if (!user?.avatar_url) return;

    const confirmed = await confirm({
      title: "Remover foto de perfil",
      message: "Tem certeza que deseja remover sua foto de perfil?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setUploadingAvatar(true);
      await avatarService.deleteAvatar();

      // Atualiza o contexto removendo o avatar_url
      const updatedUser = { ...user, avatar_url: null };
      updateUser(updatedUser);

      showSuccess("Foto de perfil removida com sucesso!");
    } catch (error: any) {
      console.error("Erro ao remover avatar:", error);
      showError(error.response?.data?.detail || "Erro ao remover foto de perfil");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveNotifications = () => {
    // TODO: Salvar notificações no backend (endpoint não existe ainda)
    showWarning("Preferências de notificações salvas (Mock - endpoint não implementado)");
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
      showError("Erro ao carregar badges");
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
        showSuccess("Badge criada com sucesso!");
      } else if (selectedBadge) {
        await gamificationService.updateBadge(selectedBadge.id, badgeData);
        showSuccess("Badge atualizada com sucesso!");
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
      showSuccess(`Badge ${!badge.is_active ? "ativada" : "desativada"} com sucesso!`);
      await loadBadges();
    } catch (error) {
      console.error("Erro ao alterar status da badge:", error);
      showError("Erro ao alterar status da badge");
    }
  };

  const handleDeleteBadge = async (badge: Badge) => {
    const confirmed = await confirm({
      title: "Deletar Badge",
      message: `Tem certeza que deseja deletar a badge "${badge.name}"?`,
      confirmText: "Deletar",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await gamificationService.deleteBadge(badge.id);
      showSuccess("Badge deletada com sucesso!");
      await loadBadges();
    } catch (error) {
      console.error("Erro ao deletar badge:", error);
      showError("Erro ao deletar badge");
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

      showSuccess(`Badge "${badgeName}" atribuída com sucesso a ${usersCount} vendedor(es)!`);
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
      // Usa "board_type|action_type" como chave para diferenciar ações do mesmo tipo em boards diferentes
      const initialEditing: Record<string, number> = {};
      data.forEach(action => {
        initialEditing[`${action.board_type}|${action.action_type}`] = action.points;
      });
      setEditingPoints(initialEditing);
    } catch (error) {
      console.error("Erro ao carregar pontos:", error);
      showError("Erro ao carregar configurações de pontos");
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleUpdatePoints = async (boardType: string, actionType: string) => {
    try {
      const key = `${boardType}|${actionType}`;
      const newPoints = editingPoints[key];
      if (newPoints === undefined) return;

      await gamificationService.updateActionPoints(boardType as any, actionType, { points: newPoints });
      showSuccess("Pontos atualizados com sucesso!");
      await loadActionPoints();
    } catch (error) {
      console.error("Erro ao atualizar pontos:", error);
      showError("Erro ao atualizar pontos");
    }
  };

  const handleToggleActionStatus = async (action: ActionPoints) => {
    try {
      await gamificationService.updateActionPoints(action.board_type, action.action_type, {
        is_active: !action.is_active,
      });
      showSuccess(`Ação ${!action.is_active ? "ativada" : "desativada"} com sucesso!`);
      await loadActionPoints();
    } catch (error) {
      console.error("Erro ao alterar status da ação:", error);
      showError("Erro ao alterar status da ação");
    }
  };

  // Função para carregar histórico de logins
  const loadLoginHistory = async () => {
    try {
      setLoadingLoginHistory(true);
      const data = await authService.getLoginHistory(25);
      setLoginHistory(data.logins);
    } catch (error) {
      console.error("Erro ao carregar histórico de logins:", error);
      showError("Erro ao carregar histórico de logins");
    } finally {
      setLoadingLoginHistory(false);
    }
  };

  // Função para carregar sessões ativas do Redis (admin/manager)
  const loadOnlineUsers = async () => {
    try {
      setLoadingOnlineUsers(true);
      const data = await userService.getOnlineUsers();
      setOnlineUsers(data.users);
    } catch (error) {
      console.error("Erro ao carregar sessões ativas:", error);
      // Não mostra toast de erro — Redis pode estar offline (graceful)
      setOnlineUsers([]);
    } finally {
      setLoadingOnlineUsers(false);
    }
  };

  // Funções para gerenciar logs de auditoria (Admin/Manager)
  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogsSearched(true);

      // Busca até 500 logs da API com os filtros aplicados
      const data = await auditLogService.getLogs({
        page: 1,
        page_size: 500,
        action: logsFilters.action || undefined,
        entity_type: logsFilters.entity_type || undefined,
        user_id: logsFilters.user_id ? Number(logsFilters.user_id) : undefined,
        start_date: logsFilters.start_date || undefined,
        end_date: logsFilters.end_date || undefined,
      });

      setAuditLogs(data.logs);
      setLogsPage(1); // Reseta para primeira página
    } catch (error) {
      console.error("Erro ao carregar logs de auditoria:", error);
      showError("Erro ao carregar logs de auditoria");
    } finally {
      setLoadingLogs(false);
    }
  };

  /**
   * Aplica atalho de período nos filtros de data.
   * - today: apenas hoje
   * - yesterday: apenas ontem
   * - this_week: últimos 7 dias
   * - this_month: do dia 1 do mês atual até hoje
   */
  const applyDateShortcut = (shortcut: "today" | "yesterday" | "this_week" | "this_month") => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    switch (shortcut) {
      case "today":
        setLogsFilters((prev) => ({ ...prev, start_date: fmt(today), end_date: fmt(today) }));
        break;
      case "yesterday":
        setLogsFilters((prev) => ({ ...prev, start_date: fmt(yesterday), end_date: fmt(yesterday) }));
        break;
      case "this_week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        setLogsFilters((prev) => ({ ...prev, start_date: fmt(weekAgo), end_date: fmt(today) }));
        break;
      }
      case "this_month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setLogsFilters((prev) => ({ ...prev, start_date: fmt(monthStart), end_date: fmt(today) }));
        break;
      }
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [actions, entityTypes, users] = await Promise.all([
        auditLogService.getActions(),
        auditLogService.getEntityTypes(),
        userService.listActive(),
      ]);
      setAvailableActions(actions);
      setAvailableEntityTypes(entityTypes);
      // Ordena por nome para facilitar a busca no select
      setAvailableLogUsers(
        [...users].sort((a, b) => a.name.localeCompare(b.name))
      );
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
      user_id: "",
      start_date: "",
      end_date: "",
    });
    setAuditLogs([]);
    setLogsSearched(false);
    setExpandedLogIds(new Set());
  };

  /** Alterna a expansão da linha de detalhes de um log. */
  const toggleLogExpand = (id: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
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
        showError('Erro ao carregar configuração');
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

      // Carrega vendedores e SDRs para o formulário de vincular ramais
      const users = await userService.listActive();
      setSalespeople(users.filter(u => u.role === "salesperson" || u.role === "sdr"));
    } catch (error) {
      showError('Erro ao carregar ramais');
    } finally {
      setLoadingApi4comExtensions(false);
    }
  };

  const handleSaveApi4comConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api4comConfigForm.email || !api4comConfigForm.password) {
      showError('Preencha todos os campos');
      return;
    }

    setSavingApi4comConfig(true);
    try {
      const data = await api4comService.saveConfig(api4comConfigForm);
      setApi4comConfig(data);
      setShowApi4comConfigForm(false);
      setApi4comConfigForm({ ...api4comConfigForm, password: '' });
      showSuccess('Configuração salva e token obtido com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao salvar configuração';
      showError(message);
    } finally {
      setSavingApi4comConfig(false);
    }
  };

  const handleTestApi4comConnection = async () => {
    setTestingApi4comConnection(true);
    try {
      const result = await api4comService.testConnection();

      if (result.success) {
        showSuccess(result.message);
        loadApi4comConfig();
      } else {
        showError(result.message + (result.error ? `: ${result.error}` : ''));
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao testar conexão';
      showError(message);
    } finally {
      setTestingApi4comConnection(false);
    }
  };

  const handleSaveApi4comExtension = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api4comExtensionForm.user_id || !api4comExtensionForm.extension) {
      showError('Selecione um usuário e informe o ramal');
      return;
    }

    setSavingApi4comExtension(true);
    try {
      await api4comService.saveExtension(api4comExtensionForm);
      const message = editingApi4comExtension ? 'Ramal atualizado com sucesso!' : 'Ramal vinculado com sucesso!';
      showSuccess(message);
      setApi4comExtensionForm({ user_id: 0, extension: '' });
      setEditingApi4comExtension(null);
      loadApi4comExtensions();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao vincular ramal';
      showError(message);
    } finally {
      setSavingApi4comExtension(false);
    }
  };

  const handleDeleteApi4comExtension = async (userId: number, userName: string) => {
    const confirmed = await confirm({
      title: "Remover ramal",
      message: `Deseja remover o ramal de ${userName}?`,
      confirmText: "Remover",
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await api4comService.deleteExtension(userId);
      showSuccess('Ramal removido com sucesso!');
      loadApi4comExtensions();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao remover ramal';
      showError(message);
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
    { id: "profile" as Tab, label: "Perfil", icon: UserIcon },
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

  // Adiciona tab Templates de E-mail para admin e gerente
  if (isManagerOrAdmin) {
    tabs.push({ id: "email_templates" as Tab, label: "Templates de E-mail", icon: Mail });
  }

  const loginItemsPerPage = 5;
  const loginMaxItems = 25;
  const limitedLoginHistory = loginHistory.slice(0, loginMaxItems);
  const loginTotalItems = limitedLoginHistory.length;
  const loginTotalPages = Math.max(1, Math.ceil(loginTotalItems / loginItemsPerPage));
  const safeLoginPage = Math.min(loginPage, loginTotalPages);
  const loginStartIndex = (safeLoginPage - 1) * loginItemsPerPage;
  const loginEndIndex = Math.min(loginStartIndex + loginItemsPerPage, loginTotalItems);
  const paginatedLoginHistory = limitedLoginHistory.slice(loginStartIndex, loginEndIndex);

  const getLoginPageNumbers = () => {
    const maxButtons = 5;
    let start = Math.max(1, safeLoginPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > loginTotalPages) {
      end = loginTotalPages;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const loginPageNumbers = getLoginPageNumbers();

  const logsItemsPerPage = 25;
  // Backend já retorna os logs filtrados e ordenados (mais recente primeiro)
  // A ordenação local garante consistência mesmo que o backend mude
  const sortedAuditLogs = [...auditLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const logsTotalItems = sortedAuditLogs.length;
  const logsTotalPages = Math.max(1, Math.ceil(logsTotalItems / logsItemsPerPage));
  const safeLogsPage = Math.min(logsPage, logsTotalPages);
  const logsStartIndex = (safeLogsPage - 1) * logsItemsPerPage;
  const logsEndIndex = Math.min(logsStartIndex + logsItemsPerPage, logsTotalItems);
  const paginatedAuditLogs = sortedAuditLogs.slice(logsStartIndex, logsEndIndex);

  const getLogsPageNumbers = () => {
    const maxButtons = 5;
    let start = Math.max(1, safeLogsPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > logsTotalPages) {
      end = logsTotalPages;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const logsPageNumbers = getLogsPageNumbers();

  const getLogActionStyles = (action: string) => {
    const normalized = action?.toLowerCase();

    switch (normalized) {
      case "create":
      case "created":
        return "bg-emerald-500/20 text-slate-900 dark:text-emerald-400";
      case "update":
      case "updated":
        return "bg-blue-500/20 text-slate-900 dark:text-blue-400";
      case "delete":
      case "deleted":
      case "remove":
      case "removed":
        return "bg-red-500/20 text-slate-900 dark:text-red-400";
      case "approve":
      case "approved":
        return "bg-green-500/20 text-slate-900 dark:text-green-400";
      case "reject":
      case "rejected":
        return "bg-rose-500/20 text-slate-900 dark:text-rose-400";
      case "login":
        return "bg-cyan-500/20 text-slate-900 dark:text-cyan-400";
      case "logout":
        return "bg-slate-500/20 text-slate-900 dark:text-slate-300";
      case "transfer":
        return "bg-purple-500/20 text-slate-900 dark:text-purple-400";
      default:
        return "bg-slate-500/20 text-slate-900 dark:text-slate-300";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
          <SettingsIcon className="text-slate-900 dark:text-white" size={32} />
          Configurações
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações pessoais e preferências</p>
      </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 dark:border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-max flex-shrink-0 items-center justify-center gap-2 px-4 py-3 font-medium transition-colors sm:min-w-0 sm:flex-1 ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
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
                <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Informações do Perfil</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {/* Preview do Avatar */}
                    {avatarPreview || user?.avatar_url ? (
                      <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 dark:border-slate-700">
                        <img
                          src={avatarPreview || (user ? avatarService.getAvatarUrl(user.id) : '')}
                          alt={user?.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback para iniciais se a imagem não carregar
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && user) {
                              parent.innerHTML = `
                                <div class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white">
                                  ${getInitials(user.name)}
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white">
                        {user?.name ? getInitials(user.name) : "?"}
                      </div>
                    )}

                    {/* Botão de Upload */}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <button
                      className="absolute bottom-0 right-0 rounded-full bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700"
                      title="Upload de avatar"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload size={16} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user?.name}</h3>
                    <p className="max-w-[180px] truncate text-sm text-slate-500 dark:text-slate-400 sm:max-w-none sm:text-base">
                      {user?.email}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-medium text-slate-900 dark:text-emerald-400">
                      {user?.role_name || "Usuário"}
                    </span>

                    {/* Botões de Ação do Avatar */}
                    {avatarFile ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleUploadAvatar}
                          disabled={uploadingAvatar}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {uploadingAvatar ? "Enviando..." : "Salvar Foto"}
                        </button>
                        <button
                          onClick={handleCancelAvatarChange}
                          disabled={uploadingAvatar}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-2">
                        <p className="text-xs text-slate-500">
                          Clique no ícone para alterar sua foto
                        </p>
                        {user?.avatar_url && (
                          <button
                            onClick={handleDeleteAvatar}
                            disabled={uploadingAvatar}
                            className="w-fit rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Remover Foto
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulário */}
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Seu username"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled={user?.role === "salesperson"}
                      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
                        user?.role === "salesperson" ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      placeholder="seu@email.com"
                    />
                    {user?.role === "salesperson" && (
                      <p className="mt-1 text-xs text-slate-500">
                        Apenas administradores podem alterar o email
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Assinatura de E-mail
                      </label>
                      {profileData.email_signature && (
                        <button
                          type="button"
                          onClick={() => setShowSignaturePreview(v => !v)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {showSignaturePreview ? "Ocultar preview" : "Ver preview"}
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                      {/* Texto antes da imagem */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          Texto (opcional) — ex: Atenciosamente,
                        </label>
                        <textarea
                          rows={2}
                          value={signatureText}
                          onChange={(e) => handleSignatureTextChange(e.target.value)}
                          placeholder={"Atenciosamente,\nErick Santos — T.I"}
                          className="w-full resize-none rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Upload de imagem */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          Imagem da assinatura (JPG, PNG, WEBP — máx. 5 MB)
                        </label>
                        <input
                          ref={signatureImageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleSignatureImageUpload}
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => signatureImageInputRef.current?.click()}
                            disabled={uploadingSignatureImage}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-400 disabled:opacity-60"
                          >
                            {uploadingSignatureImage ? (
                              <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                            ) : (
                              <><Upload size={15} /> {signatureImageUrl ? "Trocar imagem" : "Enviar imagem"}</>
                            )}
                          </button>
                          {signatureImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setSignatureImageUrl(null);
                                setProfileData(p => ({ ...p, email_signature: buildSignatureHtml(signatureText, null) }));
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Remover imagem
                            </button>
                          )}
                        </div>
                        {signatureImageUrl && (
                          <img
                            src={signatureImageUrl}
                            alt="Imagem da assinatura"
                            className="mt-2 max-h-24 rounded border border-slate-200 dark:border-slate-700"
                          />
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Adicionada automaticamente ao final de todo e-mail enviado pelo CRM.
                    </p>

                    {showSignaturePreview && profileData.email_signature && (
                      <div className="mt-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 p-4">
                        <p className="mb-2 text-xs font-medium text-slate-400">Preview:</p>
                        <div className="text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: profileData.email_signature }} />
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Role (Função)
                    </label>
                    <input
                      type="text"
                      value={user?.role_name || ""}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                      placeholder="Sua função"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Apenas administradores podem alterar funções
                    </p>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
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
                <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Notificações</h2>

                {/* Canais de Notificação */}
                <div>
                  <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-white">Canais de Notificação</h3>
                  <div className="space-y-4">
                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Notificações por Email</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Notificações Push</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Notificações no App</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Tipos de Notificação */}
                <div>
                  <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-white">Tipos de Notificação</h3>
                  <div className="space-y-4">
                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Card Atribuído a Mim</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Transferência Recebida</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Transferência Aprovada/Rejeitada</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Card Ganho pela Equipe</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Badge Conquistado</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Automação Falhou</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Não Perturbe */}
                <div>
                  <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-white">Não Perturbe</h3>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    Defina um horário em que você não deseja receber notificações
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    <Save size={20} />
                    Salvar Preferências
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Segurança */}
            {activeTab === "security" && (
              <>
                {/* Seção: Sessões Ativas (Redis) — somente admin/manager */}
                {isManagerOrAdmin && (
                  <div className="mb-8 space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sessões Ativas</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Usuários com atividade nos últimos 15 minutos (dados em tempo real via Redis)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Badge de contagem */}
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                          <Wifi size={16} className="text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            {onlineUsers.length} online
                          </span>
                        </div>
                        {/* Botão de refresh */}
                        <button
                          onClick={loadOnlineUsers}
                          disabled={loadingOnlineUsers}
                          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                          title="Atualizar sessões"
                        >
                          <RefreshCw size={15} className={loadingOnlineUsers ? "animate-spin" : ""} />
                          Atualizar
                        </button>
                      </div>
                    </div>

                    {/* Lista de sessões ativas */}
                    {loadingOnlineUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : onlineUsers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center dark:border-slate-600">
                        <Wifi size={36} className="mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Nenhuma sessão ativa no momento
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          Redis pode estar offline ou sem sessões nos últimos 15 minutos
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {onlineUsers.map((online) => {
                          // Calcula há quanto tempo o usuário fez login (baseado no created_at da sessão)
                          const getLoginTimeLabel = (isoDate: string) => {
                            const diff = Math.floor((Date.now() - new Date(isoDate + "Z").getTime()) / 1000);
                            if (diff < 60) return "Entrou agora";
                            if (diff < 3600) return `Entrou há ${Math.floor(diff / 60)}min`;
                            if (diff < 86400) return `Entrou há ${Math.floor(diff / 3600)}h`;
                            return `Entrou há ${Math.floor(diff / 86400)}d`;
                          };

                          // Iniciais para o avatar
                          const initials = online.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase();

                          // Destaca o próprio usuário
                          const isSelf = online.user_id === user?.id;

                          return (
                            <div
                              key={online.user_id}
                              className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                                isSelf
                                  ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                                  : "border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50"
                              }`}
                            >
                              {/* Avatar com indicador online */}
                              <div className="relative shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white dark:bg-slate-500">
                                  {initials}
                                </div>
                                {/* Indicador verde de "online" */}
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-700" />
                              </div>

                              {/* Dados */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {online.name}
                                  </p>
                                  {isSelf && (
                                    <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {online.email}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {getLoginTimeLabel(online.created_at)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Globe size={11} />
                                    {online.ip}
                                  </span>
                                  {online.active_sessions > 1 && (
                                    <span className="flex items-center gap-1">
                                      <Monitor size={11} />
                                      {online.active_sessions} abas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Separador */}
                    <div className="border-t border-slate-200 pt-2 dark:border-slate-700" />
                  </div>
                )}

                <div className="space-y-6">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico de Logins</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Acompanhe os últimos 25 acessos à sua conta para maior segurança
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2">
                      <Shield size={16} className="text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">
                        Últimos 25 logins
                      </span>
                    </div>
                  </div>

                  {/* Lista de Histórico de Logins */}
                  <div className="space-y-3">
                    {loadingLoginHistory ? (
                      // Loading state
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : loginHistory.length === 0 ? (
                      // Empty state
                      <div className="py-12 text-center">
                        <Shield size={48} className="mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400">Nenhum login registrado ainda</p>
                      </div>
                    ) : (
                      // Login history list
                      paginatedLoginHistory.map((login) => {
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
                            className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:bg-slate-700/70"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-3">
                                {/* Ícone do dispositivo */}
                                <div className="mt-1">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                                    <Monitor size={20} className="text-blue-400" />
                                  </div>
                                </div>

                                {/* Informações do login */}
                                <div className="min-w-0 flex-1">
                                  {/* Nome do usuário e horário */}
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">{login.user_name}</p>
                                    <div className="flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <Clock size={14} />
                                      <span className="font-medium">{formatDate(login.created_at)}</span>
                                    </div>
                                  </div>

                                  {/* Browser e OS */}
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{browser}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{os}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{deviceType}</span>
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
                  {!loadingLoginHistory && loginTotalItems > 0 && (
                    <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left dark:border-slate-700/60">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrando {loginTotalItems === 0 ? 0 : loginStartIndex + 1} a {loginEndIndex} de{" "}
                        {loginTotalItems} registros
                      </div>
                      <div className="flex items-center justify-center gap-3 sm:justify-end">
                        <div className="flex items-center gap-2 sm:hidden">
                          <button
                            type="button"
                            onClick={() => setLoginPage((page) => Math.max(1, page - 1))}
                            disabled={safeLoginPage === 1}
                            className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                              safeLoginPage === 1
                                ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                : "border-gray-300 text-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"
                            }`}
                          >
                            {"<"}
                          </button>
                          <div className="flex min-w-[42px] items-center justify-center rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:text-white">
                            {safeLoginPage}
                          </div>
                          <button
                            type="button"
                            onClick={() => setLoginPage((page) => Math.min(loginTotalPages, page + 1))}
                            disabled={safeLoginPage === loginTotalPages}
                            className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                              safeLoginPage === loginTotalPages
                                ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                : "border-gray-300 text-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"
                            }`}
                          >
                            {">"}
                          </button>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                          <button
                            type="button"
                            onClick={() => setLoginPage((page) => Math.max(1, page - 1))}
                            disabled={safeLoginPage === 1}
                            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                              safeLoginPage === 1
                                ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                            }`}
                          >
                            Anterior
                          </button>
                          {loginPageNumbers.map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setLoginPage(page)}
                              className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                                page === safeLoginPage
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setLoginPage((page) => Math.min(loginTotalPages, page + 1))}
                            disabled={safeLoginPage === loginTotalPages}
                            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                              safeLoginPage === loginTotalPages
                                ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                            }`}
                          >
                            Proxima
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </>
            )}

            {/* Tab: Badges (Admin e Gerente) */}
            {activeTab === "badges" && isManagerOrAdmin && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Gerenciar Badges</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Crie e gerencie badges customizadas do sistema de gamificação
                    </p>
                  </div>
                  <div className="flex gap-3 md:justify-end">
                    <button
                      onClick={handleOpenAwardBadge}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    >
                      <UserPlus size={20} />
                      <span>Atribuir Badge</span>
                    </button>
                    <button
                      onClick={handleCreateBadge}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
                    >
                      <Plus size={20} />
                      <span>Nova Badge</span>
                    </button>
                  </div>
                </div>

                {/* Filtros e Busca */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" size={20} />
                    <input
                      type="text"
                      value={badgeSearch}
                      onChange={(e) => setBadgeSearch(e.target.value)}
                      placeholder="Buscar por nome ou descrição..."
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Total de Badges</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{badges.length}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Ativas</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {badges.filter((b) => b.is_active).length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Manuais</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {badges.filter((b) => b.criteria_type === "manual").length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Automáticas</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {badges.filter((b) => b.criteria_type === "automatic").length}
                    </p>
                  </div>
                </div>

                {/* Lista de Badges */}
                {loadingBadges ? (
                  <div className="py-12 text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando badges...</p>
                  </div>
                ) : filteredBadges.length === 0 ? (
                  <div className="py-12 text-center">
                    <Award className="mx-auto mb-4 text-slate-600" size={64} />
                    <p className="mb-2 text-lg font-medium text-slate-500 dark:text-slate-400">
                      {badges.length === 0 ? "Nenhuma badge cadastrada" : "Nenhuma badge encontrada"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {badges.length === 0
                        ? "Clique em 'Nova Badge' para criar a primeira badge"
                        : "Tente ajustar os filtros de busca"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`rounded-lg border bg-white p-5 transition-all hover:border-emerald-500/50 dark:bg-slate-900 ${
                          badge.is_active ? "border-gray-200 dark:border-slate-700" : "border-gray-100 opacity-60 dark:border-slate-800"
                        }`}
                      >
                        {/* Header do Card */}
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl">{badge.icon_url || "🏆"}</span>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white">{badge.name}</h3>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    badge.criteria_type === "manual"
                                      ? "bg-blue-500/20 text-slate-900 dark:text-blue-400"
                                      : "bg-purple-500/20 text-slate-900 dark:text-purple-400"
                                  }`}
                                >
                                  {badge.criteria_type === "manual" ? "Manual" : "Automático"}
                                </span>
                                <span
                                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    badge.is_active
                                      ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                                      : "bg-slate-500/20 text-slate-900 dark:text-slate-400"
                                  }`}
                                >
                                  {badge.is_active ? "Ativa" : "Inativa"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Descrição */}
                        <p className="mb-4 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{badge.description}</p>

                        {/* Critérios (se automático) */}
                        {badge.criteria_type === "automatic" && badge.criteria && (
                          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="mb-1 text-xs text-slate-500">Regra:</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {badge.criteria.field} {badge.criteria.operator} {badge.criteria.value}
                            </p>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBadge(badge)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            title="Editar badge"
                          >
                            <Edit2 size={16} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleToggleBadgeStatus(badge)}
                            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                              badge.is_active
                                ? "bg-yellow-600/20 text-slate-900 dark:text-yellow-400 hover:bg-yellow-600/30"
                                : "bg-emerald-600/20 text-slate-900 dark:text-emerald-400 hover:bg-emerald-600/30"
                            }`}
                            title={badge.is_active ? "Desativar badge" : "Ativar badge"}
                          >
                            {badge.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            onClick={() => handleDeleteBadge(badge)}
                            className="flex items-center justify-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
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
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
                    <Award size={16} />
                    Como funcionam as badges
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
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
                    <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Configurar Pontos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Defina quantos pontos vale cada ação no sistema de gamificação
                    </p>
                  </div>
                  <button
                    onClick={loadActionPoints}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  >
                    Atualizar
                  </button>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 backdrop-blur-xl transition-all hover:border-blue-500/40">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Total de Ações</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{actionPoints.length}</p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 backdrop-blur-xl transition-all hover:border-green-500/40">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Ações Ativas</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {actionPoints.filter((a) => a.is_active).length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 backdrop-blur-xl transition-all hover:border-purple-500/40">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Pontos Médios</p>
                    <p className="text-2xl font-bold text-purple-400">
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
                  <div className="py-12 text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando configurações...</p>
                  </div>
                ) : actionPoints.length === 0 ? (
                  <div className="py-12 text-center">
                    <Coins className="mx-auto mb-4 text-slate-600" size={64} />
                    <p className="mb-2 text-lg font-medium text-slate-500 dark:text-slate-400">Nenhuma configuração encontrada</p>
                    <p className="text-sm text-slate-500">
                      As configurações padrão serão criadas automaticamente
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Board
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Ação
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Descrição
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Pontos
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Status
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {actionPoints.map((action) => (
                            <tr key={action.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              {/* Board */}
                              <td className="px-6 py-4">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                  action.board_type === "prospecting"
                                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                }`}>
                                  {action.board_type === "prospecting" ? "Prospecção" : "Aquisição"}
                                </span>
                              </td>

                              {/* Tipo de Ação */}
                              <td className="px-6 py-4">
                                <code className="rounded bg-gray-100 px-2 py-1 text-sm text-cyan-600 dark:bg-slate-800 dark:text-cyan-400">
                                  {action.action_type}
                                </code>
                              </td>

                              {/* Descrição */}
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600 dark:text-slate-300">{action.description || "-"}</p>
                              </td>

                              {/* Pontos (editável) */}
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={editingPoints[`${action.board_type}|${action.action_type}`] ?? 0}
                                    onChange={(e) =>
                                      setEditingPoints({
                                        ...editingPoints,
                                        [`${action.board_type}|${action.action_type}`]: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-20 rounded border border-gray-300 bg-white px-3 py-1 text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                  />
                                  {editingPoints[`${action.board_type}|${action.action_type}`] !== action.points && (
                                    <button
                                      onClick={() => handleUpdatePoints(action.board_type, action.action_type)}
                                      className="rounded bg-emerald-600 p-1.5 text-white transition-colors hover:bg-emerald-700"
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
                                  className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                    action.is_active
                                      ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                                      : "bg-slate-500/20 text-slate-900 dark:text-slate-400"
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
                                    className={`rounded p-2 transition-colors ${
                                      action.is_active
                                        ? "bg-yellow-600/20 text-slate-900 dark:text-yellow-400 hover:bg-yellow-600/30"
                                        : "bg-emerald-600/20 text-slate-900 dark:text-emerald-400 hover:bg-emerald-600/30"
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
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
                    <Coins size={16} />
                    Como funciona
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
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
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Configurações API4COM (VOIP)</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Gerencie credenciais e ramais para integração com API4COM
                    </p>
                  </div>
                </div>

                {/* ========== Seção de Configuração ========== */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Credenciais da API4COM</h3>
                    {api4comConfig && !showApi4comConfigForm && (
                      <button
                        onClick={() => setShowApi4comConfigForm(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Alterar Credenciais
                      </button>
                    )}
                  </div>

                  {/* Status da Configuração */}
                  {api4comConfig && !showApi4comConfigForm && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Email:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{api4comConfig.email}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
                          <p>
                            {api4comConfig.is_active ? (
                              <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:text-green-400">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:text-red-400">
                                Inativo
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Token válido:</span>
                          <p>
                            {api4comConfig.has_valid_token ? (
                              <span className="font-medium text-green-400">Sim</span>
                            ) : (
                              <span className="font-medium text-red-400">Não</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Expira em:</span>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {api4comConfig.token_expires_at
                              ? new Date(api4comConfig.token_expires_at).toLocaleString('pt-BR')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {api4comConfig.last_test_at && (
                        <div className="border-t border-gray-200 pt-3 dark:border-slate-700">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Último teste:</span>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {new Date(api4comConfig.last_test_at).toLocaleString('pt-BR')} -{' '}
                            {api4comConfig.last_test_success ? (
                              <span className="text-green-400">Sucesso</span>
                            ) : (
                              <span className="text-red-400">Falhou</span>
                            )}
                          </p>
                          {api4comConfig.last_test_error && (
                            <p className="mt-1 text-sm text-red-400">{api4comConfig.last_test_error}</p>
                          )}
                        </div>
                      )}

                      <div className="pt-3">
                        <button
                          onClick={handleTestApi4comConnection}
                          disabled={testingApi4comConnection}
                          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Email da API4COM
                        </label>
                        <input
                          type="email"
                          value={api4comConfigForm.email}
                          onChange={(e) => setApi4comConfigForm({ ...api4comConfigForm, email: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Senha da API4COM
                        </label>
                        <input
                          type="password"
                          value={api4comConfigForm.password}
                          onChange={(e) => setApi4comConfigForm({ ...api4comConfigForm, password: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Ao salvar, o sistema fará login e obterá o token automaticamente
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={savingApi4comConfig}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* ========== Seção de Ramais ========== */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Ramais dos Usuários</h3>

                  {/* Formulário para Adicionar/Editar Ramal */}
                  <form onSubmit={handleSaveApi4comExtension} className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-slate-800">
                    <h4 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {editingApi4comExtension ? 'Editar Ramal' : 'Vincular Usuário ao Ramal'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Usuário
                        </label>
                        <SelectMenu
                          value={api4comExtensionForm.user_id ? String(api4comExtensionForm.user_id) : ""}
                          options={salespeople
                            .filter((sp) =>
                              !api4comExtensions.some((ext) => ext.user_id === sp.id)
                            )
                            .map((sp) => ({ value: String(sp.id), label: sp.name }))}
                          placeholder="Selecione..."
                          onChange={(value) =>
                            setApi4comExtensionForm({ ...api4comExtensionForm, user_id: Number(value) })
                          }
                          disabled={!!editingApi4comExtension}
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Ramal
                        </label>
                        <input
                          type="text"
                          value={api4comExtensionForm.extension}
                          onChange={(e) =>
                            setApi4comExtensionForm({ ...api4comExtensionForm, extension: e.target.value })
                          }
                          placeholder="Ex: 1000"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          required
                        />
                      </div>

                      <div className="col-span-1 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <button
                          type="submit"
                          disabled={savingApi4comExtension}
                          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
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
                            className="w-full rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30 sm:w-auto"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Tabela de Ramais */}
                  {loadingApi4comExtensions ? (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">Carregando ramais...</div>
                  ) : api4comExtensions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum ramal vinculado ainda
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Vendedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Ramal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {api4comExtensions.map((ext) => (
                            <tr key={ext.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                {ext.user_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{ext.user_email}</td>
                              <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-white">
                                {ext.extension}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {ext.is_active ? (
                                  <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:text-green-400">
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:text-slate-400">
                                    Inativo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditApi4comExtension(ext)}
                                    className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                                    title="Editar ramal"
                                    aria-label="Editar ramal"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApi4comExtension(ext.user_id, ext.user_name || '')}
                                    className="rounded-lg bg-red-600/20 p-2 text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
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
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
                    <Phone size={16} />
                    Como funciona
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <li>• Configure as credenciais da sua conta API4COM para obter o token de autenticação</li>
                    <li>• Vincule cada vendedor ou SDR ao seu ramal físico existente no sistema VOIP</li>
                    <li>• O token é renovado automaticamente quando próximo da expiração</li>
                    <li>• Vendedores e SDRs poderão fazer ligações diretamente do sistema (Fase 2)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab: Logs de Auditoria */}
            {activeTab === "logs" && isManagerOrAdmin && (
              <div className="space-y-6">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Logs de Auditoria</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aplique os filtros desejados e clique em <strong>Pesquisar</strong> para visualizar os registros de atividade do sistema
                  </p>
                </div>

                {/* Filtros */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Filter size={20} />
                    Filtros
                  </h3>

                  {/* Atalhos de período */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Período rápido:</span>
                    {(
                      [
                        { key: "today", label: "Hoje" },
                        { key: "yesterday", label: "Ontem" },
                        { key: "this_week", label: "Últimos 7 dias" },
                        { key: "this_month", label: "Este mês" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyDateShortcut(key)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {/* Filtro por Usuário */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        <UserIcon size={14} className="mr-1 inline" />
                        Usuário
                      </label>
                      <SelectMenu
                        value={logsFilters.user_id}
                        options={[
                          { value: "", label: "Todos" },
                          ...availableLogUsers.map((u) => ({ value: String(u.id), label: u.name })),
                        ]}
                        onChange={(value) => handleLogsFilterChange("user_id", value)}
                      />
                    </div>

                    {/* Filtro por Ação */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Ação
                      </label>
                      <SelectMenu
                        value={logsFilters.action}
                        options={[
                          { value: "", label: "Todas" },
                          ...availableActions.map((action) => ({ value: action, label: action })),
                        ]}
                        onChange={(value) => handleLogsFilterChange("action", value)}
                      />
                    </div>

                    {/* Filtro por Tipo de Entidade */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tipo de Entidade
                      </label>
                      <SelectMenu
                        value={logsFilters.entity_type}
                        options={[
                          { value: "", label: "Todas" },
                          ...availableEntityTypes.map((type) => ({ value: type, label: type })),
                        ]}
                        onChange={(value) => handleLogsFilterChange("entity_type", value)}
                      />
                    </div>

                    {/* Filtro por Data Inicial */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Calendar size={16} className="mr-1 inline" />
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={logsFilters.start_date}
                        onChange={(e) => handleLogsFilterChange("start_date", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Filtro por Data Final */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Calendar size={16} className="mr-1 inline" />
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={logsFilters.end_date}
                        onChange={(e) => handleLogsFilterChange("end_date", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    {/* Botão principal de pesquisa */}
                    <button
                      onClick={loadLogs}
                      disabled={loadingLogs}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      <Search size={15} />
                      {loadingLogs ? "Pesquisando..." : "Pesquisar"}
                    </button>
                    <button
                      onClick={handleClearLogsFilters}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Limpar
                    </button>
                    {/* Contador de resultados */}
                    {logsSearched && !loadingLogs && (
                      <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                        {logsTotalItems === 0
                          ? "Nenhum resultado"
                          : `${logsTotalItems} registro${logsTotalItems !== 1 ? "s" : ""} encontrado${logsTotalItems !== 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabela de Logs */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {!logsSearched ? (
                    /* Placeholder inicial — nenhuma pesquisa realizada ainda */
                    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                      <div className="mb-4 rounded-full bg-slate-100 p-5 dark:bg-slate-800">
                        <Search size={28} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="font-medium text-slate-600 dark:text-slate-400">Nenhuma pesquisa realizada</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-400 dark:text-slate-500">
                        Use os atalhos de período ou configure as datas acima e clique em{" "}
                        <strong className="text-slate-500 dark:text-slate-400">Pesquisar</strong> para visualizar os logs
                      </p>
                    </div>
                  ) : loadingLogs ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      Pesquisando logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum log encontrado para os filtros selecionados
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Data/Hora
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Usuário
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Ação
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Entidade
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Descrição
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                IP
                              </th>
                              <th className="w-8 px-2 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {paginatedAuditLogs.map((log) => {
                            const hasDetails = !!(log.data_after || log.data_before);
                            const isExpanded = expandedLogIds.has(log.id);

                            // Mapa completo de rótulos legíveis para todos os campos conhecidos
                            const detailLabels: Record<string, string> = {
                              id: "ID",
                              // card — identificação
                              title: "Título",
                              description: "Descrição",
                              list_id: "ID da lista",
                              list_name: "Lista",
                              assigned_to_id: "ID do responsável",
                              assigned_to_name: "Responsável",
                              sdr_id: "ID do SDR",
                              sdr_name: "SDR",
                              client_id: "ID do cliente",
                              client_name: "Cliente",
                              person_id: "ID do contato",
                              person_name: "Contato",
                              // card — negócio
                              value: "Valor",
                              due_date: "Vencimento",
                              deal_type: "Tipo de negócio",
                              acquisition_channel: "Canal de aquisição",
                              acquisition_channel_detail: "Detalhe do canal",
                              origin: "Origem",
                              has_implementation: "Tem implementação",
                              has_personnel: "Tem pessoal",
                              is_won: "Ganho",
                              is_lost: "Perdido",
                              // card — datas de entrada nos boards
                              prospection_entry_date: "Entrada Prospecção",
                              acquisition_entry_date: "Entrada Aquisição",
                              expansion_entry_date: "Entrada Expansão",
                              // card — UTM
                              utm_campaign: "UTM Campaign",
                              utm_source: "UTM Source",
                              utm_term: "UTM Term",
                              // board
                              name: "Nome",
                              color: "Cor",
                              icon: "Ícone",
                              // user
                              email: "E-mail",
                              username: "Usuário",
                              phone: "Telefone",
                              role_id: "ID do perfil",
                              is_active: "Ativo",
                              // client
                              company_name: "Razão social",
                              document: "CNPJ/CPF",
                              city: "Cidade",
                              state: "Estado",
                              // person
                              email_commercial: "E-mail comercial",
                              phone_whatsapp: "WhatsApp",
                              phone_commercial: "Tel. comercial",
                              position: "Cargo",
                              organization_id: "ID da organização",
                            };

                            /**
                             * Formata um valor do snapshot para exibição.
                             * Valores nulos são exibidos como "—" em cinza.
                             */
                            const formatValue = (key: string, value: unknown): { text: string; empty: boolean } => {
                              if (value === null || value === undefined || String(value).trim() === "") {
                                return { text: "—", empty: true };
                              }
                              if (typeof value === "boolean") {
                                return { text: value ? "Sim" : "Não", empty: false };
                              }
                              if (key === "value" && typeof value === "number") {
                                return {
                                  text: `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                                  empty: false,
                                };
                              }
                              if (key === "is_active") {
                                return { text: value ? "Ativo" : "Inativo", empty: false };
                              }
                              return { text: String(value), empty: false };
                            };

                            // Determina o modo de exibição do painel expandido
                            const hasBefore = !!log.data_before;
                            const hasAfter = !!log.data_after;
                            // Modo comparação: UPDATE e ações que têm antes e depois
                            const isComparison = hasBefore && hasAfter;

                            // Para comparação, separa os campos que mudaram dos que ficaram iguais
                            const comparisonKeys = isComparison
                              ? Array.from(
                                  new Set([
                                    ...Object.keys(log.data_before ?? {}),
                                    ...Object.keys(log.data_after ?? {}),
                                  ])
                                )
                              : [];
                            const changedKeys = comparisonKeys.filter((k) => {
                              const before = JSON.stringify((log.data_before ?? {})[k] ?? null);
                              const after = JSON.stringify((log.data_after ?? {})[k] ?? null);
                              return before !== after;
                            });
                            const unchangedKeys = comparisonKeys.filter(
                              (k) => !changedKeys.includes(k)
                            );

                            // Para CREATE/DELETE, exibe todos os campos incluindo os nulos
                            const singleSnapshot = isComparison
                              ? null
                              : (log.data_after ?? log.data_before ?? {});

                            return (
                              <>
                                <tr
                                  key={log.id}
                                  className={`${hasDetails ? "cursor-pointer" : ""} hover:bg-gray-50 dark:hover:bg-slate-800/50`}
                                  onClick={() => hasDetails && toggleLogExpand(log.id)}
                                >
                                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    {new Date(log.created_at).toLocaleString("pt-BR")}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    <div>
                                      <div className="font-medium">{log.user_name}</div>
                                      {log.user_email && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{log.user_email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLogActionStyles(
                                        log.action
                                      )}`}
                                    >
                                      {log.action}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    {log.entity_type}
                                    {log.entity_id && (
                                      <span className="text-slate-500"> #{log.entity_id}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    {log.description}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                    {log.ip_address}
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    {hasDetails && (
                                      <ChevronDown
                                        size={14}
                                        className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    )}
                                  </td>
                                </tr>

                                {/* Linha expandida com snapshot dos dados */}
                                {hasDetails && isExpanded && (
                                  <tr key={`${log.id}-details`} className="bg-slate-50 dark:bg-slate-800/30">
                                    <td colSpan={7} className="px-6 py-4">

                                      {/* Modo comparação (UPDATE): mostra antes × depois apenas dos campos que mudaram */}
                                      {isComparison ? (
                                        <div className="space-y-3">
                                          {changedKeys.length > 0 && (
                                            <div>
                                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Campos alterados
                                              </p>
                                              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                                                <table className="w-full text-xs">
                                                  <thead>
                                                    <tr className="border-b border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-700/50">
                                                      <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Campo</th>
                                                      <th className="px-3 py-2 text-left font-semibold text-orange-500">Antes</th>
                                                      <th className="px-3 py-2 text-left font-semibold text-emerald-500">Depois</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                    {changedKeys.map((k) => {
                                                      const before = formatValue(k, (log.data_before ?? {})[k]);
                                                      const after = formatValue(k, (log.data_after ?? {})[k]);
                                                      return (
                                                        <tr key={k} className="bg-white dark:bg-slate-800">
                                                          <td className="px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300">
                                                            {detailLabels[k] ?? k}
                                                          </td>
                                                          <td className={`px-3 py-1.5 ${before.empty ? "italic text-slate-400 dark:text-slate-500" : "text-orange-700 dark:text-orange-300"}`}>
                                                            {before.text}
                                                          </td>
                                                          <td className={`px-3 py-1.5 ${after.empty ? "italic text-slate-400 dark:text-slate-500" : "text-emerald-700 dark:text-emerald-300"}`}>
                                                            {after.text}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}

                                          {/* Campos que não mudaram, em destaque menor */}
                                          {unchangedKeys.length > 0 && (
                                            <div>
                                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Campos sem alteração
                                              </p>
                                              <div className="flex flex-wrap gap-x-5 gap-y-1">
                                                {unchangedKeys.map((k) => {
                                                  const { text, empty } = formatValue(k, (log.data_after ?? {})[k]);
                                                  return (
                                                    <div key={k} className="flex items-baseline gap-1">
                                                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                                        {detailLabels[k] ?? k}:
                                                      </span>
                                                      <span className={`text-[11px] ${empty ? "italic text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>
                                                        {text}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        /* Modo snapshot único (CREATE ou DELETE): exibe todos os campos, inclusive os nulos */
                                        <div>
                                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            {hasBefore ? "Dados antes da exclusão" : "Dados no momento da criação"}
                                          </p>
                                          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                                            {Object.entries(singleSnapshot ?? {}).map(([key, value]) => {
                                              const { text, empty } = formatValue(key, value);
                                              return (
                                                <div key={key} className="flex items-baseline gap-1.5">
                                                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    {detailLabels[key] ?? key}:
                                                  </span>
                                                  <span className={`text-xs ${empty ? "italic text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                                                    {text}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left dark:border-slate-700/60">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Mostrando {logsTotalItems === 0 ? 0 : logsStartIndex + 1} a {logsEndIndex} de{" "}
                          {logsTotalItems} registros
                        </div>
                        <div className="flex items-center justify-center gap-3 sm:justify-end">
                          <div className="flex items-center gap-2 sm:hidden">
                            <button
                              type="button"
                              onClick={() => setLogsPage((page) => Math.max(1, page - 1))}
                              disabled={safeLogsPage === 1}
                              className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                                safeLogsPage === 1
                                  ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                  : "border-gray-300 text-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"
                              }`}
                            >
                              {"<"}
                            </button>
                            <div className="flex min-w-[42px] items-center justify-center rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:text-white">
                              {safeLogsPage}
                            </div>
                            <button
                              type="button"
                              onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}
                              disabled={safeLogsPage === logsTotalPages}
                              className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                                safeLogsPage === logsTotalPages
                                  ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                  : "border-gray-300 text-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"
                              }`}
                            >
                              {">"}
                            </button>
                          </div>
                          <div className="hidden items-center gap-2 sm:flex">
                            <button
                              type="button"
                              onClick={() => setLogsPage((page) => Math.max(1, page - 1))}
                              disabled={safeLogsPage === 1}
                              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                safeLogsPage === 1
                                  ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                  : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                              }`}
                            >
                              Anterior
                            </button>
                            {logsPageNumbers.map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setLogsPage(page)}
                                className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                                  page === safeLogsPage
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}
                              disabled={safeLogsPage === logsTotalPages}
                              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                safeLogsPage === logsTotalPages
                                  ? "border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"
                                  : "border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                              }`}
                            >
                              Proxima
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Templates de E-mail */}
            {activeTab === "email_templates" && isManagerOrAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">Templates de E-mail</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Crie templates reutilizáveis com variáveis dinâmicas para agilizar o envio de e-mails pelo CRM.
                    </p>
                  </div>
                  <button
                    onClick={openCreateTemplate}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Novo Template
                  </button>
                </div>

                {/* Variáveis disponíveis */}
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="mb-2 text-sm font-medium text-blue-400">Variáveis disponíveis</p>
                  <div className="flex flex-wrap gap-2">
                    {["{{nome_contato}}", "{{empresa}}", "{{nome_vendedor}}", "{{titulo_card}}", "{{valor_card}}"].map(v => (
                      <span key={v} className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs text-blue-300">{v}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Insira essas variáveis no assunto ou corpo do template. Elas serão substituídas automaticamente ao usar o template no envio.
                  </p>
                </div>

                {loadingTemplates ? (
                  <div className="flex justify-center py-10"><LoadingSpinner /></div>
                ) : emailTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-14 dark:border-slate-700">
                    <Mail size={32} className="mb-3 text-slate-400" />
                    <p className="text-sm text-slate-500">Nenhum template cadastrado ainda.</p>
                    <button onClick={openCreateTemplate} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
                      Criar primeiro template
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white">{tpl.name}</span>
                            {!tpl.is_active && (
                              <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400">Inativo</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Assunto:</span> {tpl.subject}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{tpl.body}</p>
                        </div>
                        <div className="ml-4 flex shrink-0 gap-2">
                          <button
                            onClick={() => openEditTemplate(tpl)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-400 dark:hover:bg-slate-700"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => deleteTemplate(tpl)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-400 dark:hover:bg-slate-700"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {activeTab === "security" && (
          <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
              <Shield size={16} />
              Sobre o Histórico de Logins
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cada login realizado no sistema é registrado com informações de{" "}
              <strong>endereço IP</strong>, <strong>dispositivo</strong> e{" "}
              <strong>navegador</strong> utilizado. Isso permite auditar acessos e identificar
              atividades suspeitas. Os registros são mantidos permanentemente para fins de
              segurança e conformidade.
            </p>
          </div>
        )}

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

      {/* Modal: Criar / Editar Template de E-mail */}
      {templateModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <h3 className="text-base font-semibold text-white">
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </h3>
              <button onClick={() => setTemplateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {/* Chips de variáveis */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Clique para inserir variável no cursor</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "{{nome_contato}}", title: "Nome do contato" },
                    { label: "{{empresa}}", title: "Empresa/cliente" },
                    { label: "{{nome_vendedor}}", title: "Nome do vendedor/SDR logado" },
                    { label: "{{titulo_card}}", title: "Título do card" },
                    { label: "{{valor_card}}", title: "Valor do card" },
                  ].map(v => (
                    <button
                      key={v.label}
                      type="button"
                      title={v.title}
                      onClick={() => {
                        const ta = document.getElementById("tpl-body") as HTMLTextAreaElement | null;
                        if (ta) {
                          const start = ta.selectionStart;
                          const end = ta.selectionEnd;
                          const newBody = templateForm.body.slice(0, start) + v.label + templateForm.body.slice(end);
                          setTemplateForm(f => ({ ...f, body: newBody }));
                          setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + v.label.length; ta.focus(); }, 0);
                        } else {
                          setTemplateForm(f => ({ ...f, body: f.body + v.label }));
                        }
                      }}
                      className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs text-blue-300 hover:bg-blue-500/40"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Nome do template *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Apresentação Inicial"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Assunto *</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Ex: Olá {{nome_contato}}, temos uma proposta para você"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Mensagem *</label>
                <textarea
                  id="tpl-body"
                  rows={7}
                  value={templateForm.body}
                  onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Olá {{nome_contato}},&#10;&#10;Meu nome é {{nome_vendedor}} da {{empresa}}..."
                  className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={templateForm.is_active}
                  onChange={e => setTemplateForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                Template ativo (visível para uso nos e-mails)
              </label>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-700 px-6 py-4">
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="flex-1 rounded-lg border border-red-500/50 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingTemplate ? "Salvando..." : editingTemplate ? "Salvar alterações" : "Criar template"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
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
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform dark:text-slate-400 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
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
