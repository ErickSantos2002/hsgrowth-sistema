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
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";
import NotificationDropdown from "../components/NotificationDropdown";
import GlobalSearch from "../components/GlobalSearch";
import { UserAvatar } from "../components/common";

const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false, managerOrAdminOnly: false },
    { path: "/boards", icon: Trello, label: "Boards", adminOnly: false, managerOrAdminOnly: false },
    { path: "/clients", icon: Users, label: "Clientes", adminOnly: false, managerOrAdminOnly: false },
    { path: "/persons", icon: Contact, label: "Pessoas", adminOnly: false, managerOrAdminOnly: false },
    { path: "/products", icon: Package, label: "Produtos", adminOnly: false, managerOrAdminOnly: false },
    { path: "/gamification", icon: Trophy, label: "Gamificação", adminOnly: false, managerOrAdminOnly: false },
    { path: "/transfers", icon: Repeat, label: "Transferências", adminOnly: false, managerOrAdminOnly: false },
    { path: "/reports", icon: FileText, label: "Relatórios", adminOnly: false, managerOrAdminOnly: true },
    { path: "/automations", icon: Workflow, label: "Automações", adminOnly: false, managerOrAdminOnly: true },
    { path: "/settings", icon: Settings, label: "Configurações", adminOnly: false, managerOrAdminOnly: false },
    { path: "/users", icon: UserCircle, label: "Usuários", adminOnly: true, managerOrAdminOnly: false },
];

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Overlay para mobile quando sidebar está aberta */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-700/50 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
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
                                    <p className="mt-1 text-xs text-slate-500">CRM & Sales</p>
                                </div>
                            )}
                        </div>
                        {sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="text-slate-400 transition-colors hover:text-white lg:hidden"
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

                                const Icon = item.icon;

                                // Verifica se o item está ativo
                                // Para "Boards", considera também sub-rotas (/boards/:id e /cards/:id)
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
                                                    ? "bg-slate-800 text-white shadow-lg shadow-slate-800/20"
                                                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
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
                                                                    : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                                                            }`}
                                                        >
                                                            Admin
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {/* Tooltip para modo mini */}
                                            {!sidebarOpen && (
                                                <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                    {item.label}
                                                    {item.adminOnly && (
                                                        <span className="ml-2 text-xs text-orange-400">
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
                        <div className="mt-auto border-t border-slate-700/50 px-3 py-4">
                            <div className="space-y-1 text-center">
                                <p className="text-xs font-medium text-slate-500">
                                    HSGrowth CRM v1.1.10
                                </p>
                                <p className="text-[10px] text-slate-600">
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
                <nav className="z-[2000] flex-shrink-0 border-b border-slate-700/50 bg-slate-900/50 px-6 py-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800/50 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Busca Global */}
                        <GlobalSearch />

                        <div className="flex flex-shrink-0 items-center gap-3">
                            {/* Avatar + Info do Usuário */}
                            <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 transition-all hover:bg-slate-800/70">
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
                                    <span className="text-sm font-medium text-white">
                                        {user?.full_name || user?.username || "Usuário"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {user?.role === "admin"
                                            ? "Administrador"
                                            : user?.role === "manager"
                                            ? "Gerente"
                                            : "Usuário"}
                                    </span>
                                </div>
                            </div>

                            {/* Notificações */}
                            <NotificationDropdown />

                            {/* Botão Sair (só ícone) */}
                            <button
                                onClick={handleLogout}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-red-400 transition-all hover:border-red-500/30 hover:bg-red-500/20"
                                title="Sair"
                            >
                                <LogOut size={22} />
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
