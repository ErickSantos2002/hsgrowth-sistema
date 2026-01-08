import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Trello,
    Target,
    UserCircle,
    Settings,
    Menu,
    X,
    LogOut,
    Trophy,
    FileText,
    Bell,
    Repeat,
    Workflow,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
    { path: "/boards", icon: Trello, label: "Boards", adminOnly: false },
    { path: "/cards", icon: Target, label: "Cards", adminOnly: false },
    { path: "/clients", icon: Users, label: "Clientes", adminOnly: false },
    { path: "/gamification", icon: Trophy, label: "Gamificação", adminOnly: false },
    { path: "/transfers", icon: Repeat, label: "Transferências", adminOnly: false },
    { path: "/reports", icon: FileText, label: "Relatórios", adminOnly: false },
    { path: "/automations", icon: Workflow, label: "Automações", adminOnly: false },
    { path: "/notifications", icon: Bell, label: "Notificações", adminOnly: false },
    { path: "/settings", icon: Settings, label: "Configurações", adminOnly: false },
    { path: "/users", icon: UserCircle, label: "Usuários", adminOnly: true },
];

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-r border-slate-700/50 ${
                    sidebarOpen
                        ? "w-64 translate-x-0"
                        : "w-20 lg:translate-x-0 -translate-x-full"
                }`}
            >
                <div className="h-full px-3 py-4 overflow-y-auto">
                    {/* Logo */}
                    <div className={`flex items-center mb-8 px-3 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
                        <div className={`flex items-center gap-3 ${sidebarOpen ? "" : "flex-col"}`}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-300 rounded-full blur-sm"></div>
                                <div className="relative bg-gradient-to-br from-cyan-300 to-blue-200 rounded-full p-1">
                                    <img
                                        src={logo}
                                        alt="HSGrowth CRM"
                                        className="h-10 w-10 object-contain relative z-10"
                                    />
                                </div>
                            </div>
                            {sidebarOpen && (
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                        HSGrowth
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-1">CRM & Sales</p>
                                </div>
                            )}
                        </div>
                        {sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>

                    {/* Menu Items */}
                    <ul className="space-y-2 font-medium">
                        {menuItems.map((item) => {
                            // Ocultar itens de admin se o usuário não for admin
                            if (item.adminOnly && user?.role !== "admin") {
                                return null;
                            }

                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative ${
                                            isActive
                                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                                                : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                                        } ${sidebarOpen ? "" : "justify-center"}`}
                                        title={!sidebarOpen ? item.label : ""}
                                    >
                                        <Icon
                                            size={20}
                                            className={`${sidebarOpen ? "mr-3" : ""} ${isActive ? "" : "group-hover:scale-110 transition-transform"}`}
                                        />
                                        {sidebarOpen && (
                                            <>
                                                <span>{item.label}</span>
                                                {item.adminOnly && (
                                                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                        Admin
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {/* Tooltip para modo mini */}
                                        {!sidebarOpen && (
                                            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                                                {item.label}
                                                {item.adminOnly && (
                                                    <span className="ml-2 text-xs text-yellow-400">
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
            </aside>

            {/* Main Content */}
            <div className={`${sidebarOpen ? "lg:ml-64" : "lg:ml-20"} transition-all duration-300`}>
                {/* Top Navbar */}
                <nav className="sticky top-0 z-30 bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-slate-400 rounded-lg hover:bg-slate-800/50 hover:text-white transition-all"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                <UserCircle size={20} className="text-blue-400" />
                                <div className="flex flex-col">
                                    <span className="text-sm text-white font-medium">
                                        {user?.username || "Usuário"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {user?.role === "admin" ? "Administrador" : "Usuário"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                                title="Sair"
                            >
                                <LogOut size={18} />
                                <span className="text-sm font-medium">Sair</span>
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
