import React, { useState, useEffect } from "react";
import { User, Bell, Save, Upload, Shield, Monitor, Clock, Activity, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";

type Tab = "profile" | "notifications" | "security";

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const tabs = [
    { id: "profile" as Tab, label: "Perfil", icon: User },
    { id: "notifications" as Tab, label: "Notificações", icon: Bell },
    { id: "security" as Tab, label: "Segurança", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
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
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
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
                      className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors"
                      title="Upload de avatar (não implementado)"
                      onClick={() => alert("Upload de avatar será implementado no futuro")}
                    >
                      <Upload size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
                    <p className="text-slate-400">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-purple-600/20 text-purple-400 text-sm font-medium rounded-full">
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-5 h-5 text-purple-600 bg-slate-600 border-slate-500 rounded focus:ring-2 focus:ring-purple-500"
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
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
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
                <div className="flex items-center justify-between mb-6">
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
                      <div className="flex items-center justify-between">
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
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{activeUser.name}</p>
                              {activeUser.id === user?.id && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400">{activeUser.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded">
                                {activeUser.role}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Monitor size={12} />
                                <span>{activeUser.device}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status e Última Atividade */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1">
                            <Clock size={14} />
                            <span>{activeUser.lastActivity}</span>
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

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
