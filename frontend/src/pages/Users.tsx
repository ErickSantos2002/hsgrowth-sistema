import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, Trash2, RefreshCw, Shield, UserCircle, Clock, Key, ChevronDown } from "lucide-react";
import userService from "../services/userService";
import { User } from "../types";
import { useAuth } from "../hooks/useAuth";
import UserModal from "../components/users/UserModal";
import AdminPasswordResetModal from "../components/users/AdminPasswordResetModal";
import { showSuccess, showError, showWarning } from "../utils/toast";

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all"); // all, admin, manager, salesperson, sdr
  const [filterActive, setFilterActive] = useState<string>("all"); // all, active, inactive

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Estados do modal de reset de senha
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Verifica se o usuário atual é admin
  const isAdmin = currentUser?.role === "admin";

  /**
   * Carrega os usuários ao montar o componente
   */
  useEffect(() => {
    loadUsers();
  }, []);

  /**
   * Carrega lista de usuários do backend
   */
  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await userService.list({
        page: 1,
        page_size: 100,
      });

      setUsers(response.users || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      showError("Erro ao carregar usuários");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal para criar novo usuário
   */
  const handleCreate = () => {
    if (!isAdmin) {
      showWarning("Apenas administradores podem criar usuários");
      return;
    }
    setEditingUser(null);
    setShowModal(true);
  };

  /**
   * Abre modal para editar usuário
   */
  const handleEdit = (user: User) => {
    if (!isAdmin) {
      showWarning("Apenas administradores podem editar usuários");
      return;
    }
    setEditingUser(user);
    setShowModal(true);
  };

  /**
   * Deleta um usuário
   */
  const handleDelete = async (user: User) => {
    if (!isAdmin) {
      showWarning("Apenas administradores podem deletar usuários");
      return;
    }

    if (user.id === currentUser?.id) {
      showWarning("Você não pode deletar seu próprio usuário");
      return;
    }

    if (confirm(`Tem certeza que deseja deletar o usuário "${user.name}"?`)) {
      try {
        await userService.delete(user.id);
        await loadUsers();
        showSuccess("Usuário deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        showError("Erro ao deletar usuário");
      }
    }
  };

  /**
   * Salva usuário (criar ou editar)
   */
  const handleSave = async () => {
    await loadUsers();
    setShowModal(false);
  };

  /**
   * Abre modal de reset de senha
   */
  const handleResetPassword = (user: User) => {
    if (!isAdmin) {
      showWarning("Apenas administradores podem resetar senhas");
      return;
    }
    setResetPasswordUser(user);
    setShowPasswordResetModal(true);
  };

  /**
   * Processa o reset de senha
   */
  const handlePasswordResetSuccess = async (newPassword: string | null) => {
    if (!resetPasswordUser) return;

    try {
      const response = await userService.adminResetPassword(
        resetPasswordUser.id,
        newPassword
      );

      // Se gerou senha temporária, exibe para o admin
      if (response.temporary_password) {
        showSuccess(
          `Senha resetada! Senha temporária: ${response.temporary_password} - Copie e envie para ${resetPasswordUser.name}.`,
          8000
        );
      } else {
        showSuccess(`Senha de ${resetPasswordUser.name} foi resetada com sucesso!`);
      }

      setShowPasswordResetModal(false);
      setResetPasswordUser(null);
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error);
      showError(
        error.response?.data?.detail ||
          "Erro ao resetar senha. Tente novamente."
      );
    }
  };

  /**
   * Filtra usuários baseado na busca e filtros
   */
  const filteredUsers = users.filter((user) => {
    // Filtro de busca
    const matchesSearch =
      !searchTerm ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de role
    const matchesRole = filterRole === "all" || user.role === filterRole;

    // Filtro de status
    const matchesStatus =
      filterActive === "all" ||
      (filterActive === "active" && user.is_active) ||
      (filterActive === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Formata data/hora
  const formatDateTime = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("pt-BR");
  };

  // Retorna cor do badge de role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-400";
      case "manager":
        return "bg-blue-500/20 text-blue-400";
      case "salesperson":
        return "bg-emerald-500/20 text-emerald-400";
      case "sdr":
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  // Retorna ícone de role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield size={16} />;
      case "manager":
        return <UserCircle size={16} />;
      case "salesperson":
        return <UserCircle size={16} />;
      case "sdr":
        return <UserCircle size={16} />;
      default:
        return <UserCircle size={16} />;
    }
  };

  // Gera iniciais do nome
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Verifica se não é admin e retorna mensagem
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <div className="mb-4">
            <Shield size={64} className="mx-auto text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-slate-400">
            Apenas administradores podem gerenciar usuários.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <UserCircle className="text-white" size={32} />
            Usuários
          </h1>
          <p className="mt-1 text-slate-400">Gerencie os usuários do sistema</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
          >
            <Plus size={16} />
            Novo Usuário
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome, email ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="w-full md:w-56">
            <SelectMenu
              value={filterRole}
              options={[
                { value: "all", label: "Todos" },
                { value: "admin", label: "Administrador" },
                { value: "manager", label: "Gerente" },
                { value: "salesperson", label: "Vendedor" },
                { value: "sdr", label: "SDR" },
              ]}
              onChange={setFilterRole}
            />
          </div>

          <div className="w-full md:w-56">
            <SelectMenu
              value={filterActive}
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Ativos" },
                { value: "inactive", label: "Inativos" },
              ]}
              onChange={setFilterActive}
            />
          </div>
        </div>
      </div>

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-400">
        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""} encontrado
        {filteredUsers.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de usuários */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Carregando usuários...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center">
          <p className="mb-4 text-slate-400">
            {searchTerm || filterRole !== "all" || filterActive !== "all"
              ? "Nenhum usuário encontrado com os filtros aplicados"
              : "Nenhum usuário cadastrado ainda"}
          </p>
          {!searchTerm && filterRole === "all" && filterActive === "all" && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
            >
              <Plus size={16} />
              Cadastrar Primeiro Usuário
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-700/30"
                  >
                    {/* Usuário */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex h-10 min-h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-semibold text-white">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-medium text-white">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                                Você
                              </span>
                            )}
                          </div>
                          {user.username && (
                            <div className="text-sm text-slate-400">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-white">{user.email}</div>
                        {user.phone && (
                          <div className="text-slate-400">{user.phone}</div>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role_name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          user.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {user.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Último Login */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {user.last_login_at ? (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {formatDateTime(user.last_login_at)}
                        </div>
                      ) : (
                        <span className="text-slate-500">Nunca</span>
                      )}
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="rounded-lg bg-yellow-600/20 p-2 text-yellow-400 transition-colors hover:bg-yellow-600/30"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="rounded-lg bg-slate-600/20 p-2 text-slate-300 transition-colors hover:bg-slate-600/30"
                          title="Trocar Senha"
                        >
                          <Key size={16} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="rounded-lg bg-red-600/20 p-2 text-red-400 transition-colors hover:bg-red-600/30"
                            title="Deletar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Usuário */}
      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        user={editingUser}
      />

      {/* Modal de Reset de Senha */}
      <AdminPasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setResetPasswordUser(null);
        }}
        onSuccess={handlePasswordResetSuccess}
        user={resetPasswordUser}
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
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange }) => {
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

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
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

export default Users;
