import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Trello,
    UserCircle,
    Settings,
    Menu,
    X,
    LogOut,
    Trophy,
    FileText,
    Repeat,
    Workflow,
    Package,
    Contact,
    Sun,
    Moon,
    BellOff,
    CheckSquare,
    Phone,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/logo.png";
import NotificationDropdown from "../components/NotificationDropdown";
import GlobalSearch from "../components/GlobalSearch";
import { UserAvatar } from "../components/common";
import ChangelogModal from "../components/common/ChangelogModal";
import { AgentGrowthWidget } from "../components/agentGrowth";

const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/activities", icon: CheckSquare, label: "Atividades", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/boards", icon: Trello, label: "Boards", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/clients", icon: Users, label: "Clientes", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/persons", icon: Contact, label: "Pessoas", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/products", icon: Package, label: "Produtos", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: true },
    { path: "/ligacoes", icon: Phone, label: "Ligações", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
    { path: "/gamification", icon: Trophy, label: "Gamificação", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
    { path: "/transfers", icon: Repeat, label: "Transferências", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
    { path: "/reports", icon: FileText, label: "Relatórios", adminOnly: false, managerOrAdminOnly: true, viewerAllowed: false },
    { path: "/automations", icon: Workflow, label: "Automações", adminOnly: false, managerOrAdminOnly: true, viewerAllowed: false },
    { path: "/settings", icon: Settings, label: "Configurações", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
    { path: "/users", icon: UserCircle, label: "Usuários", adminOnly: true, managerOrAdminOnly: false, viewerAllowed: false },
];

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [changelogOpen, setChangelogOpen] = useState(false);

    // Controla visibilidade do aviso de permissão de notificações do browser
    const [showNotificationBanner, setShowNotificationBanner] = useState(false);

    // Verifica se o browser suporta notificações e se ainda não foi concedida permissão
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            setShowNotificationBanner(true);
        }
    }, []);

    /**
     * Solicita permissão para notificações nativas do browser ao clicar no banner.
     * Esconde o banner independente da resposta do usuário.
     */
    const handleRequestNotificationPermission = async () => {
        setShowNotificationBanner(false);
        await Notification.requestPermission();
    };

    // Define estado inicial da sidebar baseado no tamanho da tela
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true); // Desktop: aberta
            } else {
                setSidebarOpen(false); // Mobile: fechada
            }
        };

        // Executa na primeira renderização
        handleResize();

        // Adiciona listener de resize
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleLogout = async () => {
        await logout();
        // Força reload completo da página para limpar todo o estado
        window.location.href = "/login";
    };

    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Overlay para mobile quando sidebar está aberta */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-[2900] bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 z-[3000] h-screen border-r border-gray-200 bg-white backdrop-blur-xl transition-all duration-300 dark:border-slate-700/50 dark:bg-gradient-to-b dark:from-slate-900/95 dark:to-slate-950/95 ${
                    sidebarOpen
                        ? "w-64 translate-x-0"
                        : "w-20 -translate-x-full lg:translate-x-0"
                }`}
            >
                <div className={`flex h-full flex-col py-4 ${sidebarOpen ? "px-3" : "px-2"}`}>
                    {/* Logo */}
                    <div className={`mb-8 flex items-center ${sidebarOpen ? "justify-between px-3" : "justify-center px-0"}`}>
                        <div className={`flex flex-shrink-0 items-center ${sidebarOpen ? "gap-3" : ""}`}>
                            <div className={`relative flex flex-shrink-0 items-center justify-center ${sidebarOpen ? "h-12 w-12" : "h-10 w-10"}`}>
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-400 to-blue-300 blur-sm"></div>
                                <div className="relative overflow-hidden rounded-full bg-gradient-to-br from-cyan-300 to-blue-200 p-1">
                                    <img
                                        src={logo}
                                        alt="HSGrowth CRM"
                                        className={`relative z-10 object-contain ${sidebarOpen ? "h-8 w-8" : "h-6 w-6"}`}
                                    />
                                </div>
                            </div>
                            {sidebarOpen && (
                                <div>
                                    <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-xl font-bold text-transparent">
                                        HSGrowth
                                    </h1>
                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">CRM & Sales</p>
                                </div>
                            )}
                        </div>
                        {sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white lg:hidden"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                        <ul className="space-y-2 font-medium">
                            {menuItems.map((item) => {
                                // Ocultar itens de admin se o usuário não for admin
                                if (item.adminOnly && user?.role !== "admin") {
                                    return null;
                                }

                                // Ocultar itens de manager/admin se o usuário for vendedor
                                if (item.managerOrAdminOnly && user?.role === "salesperson") {
                                    return null;
                                }

                                // Ocultar itens não permitidos para visualizadores
                                if (!item.viewerAllowed && user?.role === "viewer") {
                                    return null;
                                }

                                const Icon = item.icon;

                                // Verifica se o item está ativo
                                const isActive =
                                    location.pathname === item.path ||
                                    (item.path === "/boards" &&
                                     (location.pathname.startsWith("/boards/") ||
                                      location.pathname.startsWith("/cards/")));

                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            onClick={() => {
                                                // Fecha sidebar no mobile ao clicar em um item
                                                if (window.innerWidth < 1024) {
                                                    setSidebarOpen(false);
                                                }
                                            }}
                                            className={`group relative flex items-center rounded-xl p-3 transition-all duration-200 ${
                                                isActive
                                                    ? "bg-gray-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white dark:shadow-slate-800/20"
                                                    : "text-slate-600 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                                            } ${sidebarOpen ? "" : "justify-center"}`}
                                            title={!sidebarOpen ? item.label : ""}
                                        >
                                            <Icon
                                                size={20}
                                                className={`${sidebarOpen ? "mr-3" : ""} ${isActive ? "" : "transition-transform group-hover:scale-110"}`}
                                            />
                                            {sidebarOpen && (
                                                <>
                                                    <span>{item.label}</span>
                                                    {/* Badge de Admin */}
                                                    {item.adminOnly && (
                                                        <span
                                                            className={`ml-auto rounded border px-2 py-0.5 text-xs ${
                                                                isActive
                                                                    ? "border-emerald-600/60 bg-emerald-700 text-white"
                                                                    : "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                                                            }`}
                                                        >
                                                            Admin
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {/* Tooltip para modo mini */}
                                            {!sidebarOpen && (
                                                <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 opacity-0 transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                                    {item.label}
                                                    {item.adminOnly && (
                                                        <span className="ml-2 text-xs text-orange-500 dark:text-orange-400">
                                                            (Admin)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Rodapé da Sidebar */}
                    {sidebarOpen && (
                        <div className="mt-auto border-t border-gray-200 px-3 py-4 dark:border-slate-700/50">
                            <div className="space-y-1 text-center">
                                {/* Versão clicável — abre o changelog resumido */}
                                <button
                                    onClick={() => setChangelogOpen(true)}
                                    className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                    title="Ver o que há de novo nessa versão"
                                >
                                    HSGrowth CRM v1.7.11
                                </button>
                                <p className="text-[10px] text-slate-300 dark:text-slate-600">
                                    © 2026 Health & Safety Tech
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className={`${sidebarOpen ? "lg:ml-64" : "lg:ml-20"} flex h-screen flex-col transition-all duration-300`}>
                {/* Top Navbar */}
                <nav className="z-[2000] flex-shrink-0 border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
                    <div className="relative flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="order-1 flex-shrink-0 rounded-lg p-2 text-slate-500 transition-all hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Ações do topo */}
                        <div className="order-2 ml-auto flex flex-shrink-0 items-center gap-3 sm:order-3 sm:ml-auto">
                            {/* Avatar + Info do Usuário */}
                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-100/50 px-3 py-1 transition-all hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/70">
                                {/* Avatar com indicador online */}
                                <UserAvatar
                                    userId={user?.id}
                                    userName={user?.name || user?.full_name || user?.username || "Usuário"}
                                    avatarUrl={user?.avatar_url}
                                    size="sm"
                                    showOnlineIndicator={true}
                                    isOnline={true}
                                />

                                {/* Nome e Role */}
                                <div className="hidden flex-col md:flex">
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {user?.full_name || user?.username || "Usuário"}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {user?.role === "admin"
                                            ? "Administrador"
                                            : user?.role === "manager"
                                            ? "Gerente"
                                            : user?.role === "salesperson"
                                            ? "Vendedor"
                                            : user?.role === "sdr"
                                            ? "SDR"
                                            : user?.role === "viewer"
                                            ? "Visualizador"
                                            : "Usuário"}
                                    </span>
                                </div>
                            </div>

                            {/* Toggle de tema claro/escuro */}
                            <button
                                onClick={toggleDarkMode}
                                className="rounded-lg border border-gray-200 bg-gray-100/50 p-2.5 text-slate-500 transition-all hover:bg-gray-100 hover:text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
                                title={darkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Notificações */}
                            <NotificationDropdown />

                            {/* Botão Sair (só ícone) */}
                            <button
                                onClick={handleLogout}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-red-500 transition-all hover:border-red-500/30 hover:bg-red-500/20 dark:text-red-400"
                                title="Sair"
                            >
                                <LogOut size={22} />
                            </button>
                        </div>

                        {/* Busca Global */}
                        <div className="order-3 mt-4 w-full sm:mt-0 sm:order-2 sm:flex-1 sm:px-4 flex justify-center items-center">
                            <div className="w-full max-w-2xl">
                                <GlobalSearch />
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Banner de permissão de notificações — aparece enquanto o usuário não decidiu */}
                {showNotificationBanner && (
                    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 sm:px-6">
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                            <BellOff size={16} className="flex-shrink-0" />
                            <span>
                                Você ainda não autorizou as notificações do sistema.
                                Para ser avisado quando um card for atribuído a você,{" "}
                                <button
                                    onClick={handleRequestNotificationPermission}
                                    className="font-semibold underline underline-offset-2 transition-colors hover:text-amber-900 dark:hover:text-amber-300"
                                >
                                    clique aqui para ativar
                                </button>
                                .
                            </span>
                        </div>
                        <button
                            onClick={() => setShowNotificationBanner(false)}
                            className="flex-shrink-0 text-amber-600 transition-colors hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300"
                            title="Fechar aviso"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

            {/* Modal de changelog — aberto ao clicar na versão na sidebar */}
            <ChangelogModal
                isOpen={changelogOpen}
                onClose={() => setChangelogOpen(false)}
            />

            {/* Agent Growth — widget flutuante de chat com IA, não exibido para viewer */}
            {user?.role !== "viewer" && <AgentGrowthWidget />}
        </div>
    );
}
