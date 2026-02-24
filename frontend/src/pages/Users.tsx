import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, RefreshCw, Shield, UserCircle, Clock, Key, ChevronDown, Users as UsersIcon } from "lucide-react";
import userService from "../services/userService";
import { User } from "../types";
import { useAuth, usePagination, useFilter, filterHelpers } from "../hooks";
import UserModal from "../components/users/UserModal";
import AdminPasswordResetModal from "../components/users/AdminPasswordResetModal";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { SearchInput, Pagination, UserAvatar } from "../components/common";
import { PageHeader } from "../components/layout";

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Hook de filtros - substitui lógica manual de filtros
  const {
    filteredItems: filteredUsers,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
  } = useFilter(users, {
    search: filterHelpers.searchInFields(["name", "email", "username"]),
    role: (user, role) => role === "all" || user.role === role,
    status: (user, status) =>
      status === "all" ||
      (status === "active" && user.is_active) ||
      (status === "inactive" && !user.is_active),
  });

  // Hook de paginação - adiciona paginação aos usuários filtrados
  const pagination = usePagination(filteredUsers, 10);

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

  // Filtros agora são gerenciados pelo hook useFilter
  // Removido código duplicado de filtros

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
        return "bg-purple-500/20 text-slate-900 dark:text-purple-400";
      case "manager":
        return "bg-blue-500/20 text-slate-900 dark:text-blue-400";
      case "salesperson":
        return "bg-emerald-500/20 text-slate-900 dark:text-emerald-400";
      case "sdr":
        return "bg-amber-500/20 text-slate-900 dark:text-amber-400";
      default:
        return "bg-slate-500/20 text-slate-900 dark:text-slate-400";
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

  // Verifica se não é admin e retorna mensagem
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <div className="mb-4">
            <Shield size={64} className="mx-auto text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Apenas administradores podem gerenciar usuários.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
        icon={UsersIcon}
        actions={
          <>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
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
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, email ou username..."
        />

        <div className="w-full md:w-56">
          <SelectMenu
            value={customFilters.role || "all"}
            options={[
              { value: "all", label: "Todos" },
              { value: "admin", label: "Administrador" },
              { value: "manager", label: "Gerente" },
              { value: "salesperson", label: "Vendedor" },
              { value: "sdr", label: "SDR" },
            ]}
            onChange={(value) => setCustomFilter("role", value)}
          />
        </div>

        <div className="w-full md:w-56">
          <SelectMenu
            value={customFilters.status || "all"}
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Ativos" },
              { value: "inactive", label: "Inativos" },
            ]}
            onChange={(value) => setCustomFilter("status", value)}
          />
        </div>
      </div>

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""} encontrado
        {filteredUsers.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de usuários */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando usuários...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || (customFilters.role && customFilters.role !== "all") || (customFilters.status && customFilters.status !== "all")
              ? "Nenhum usuário encontrado com os filtros aplicados"
              : "Nenhum usuário cadastrado ainda"}
          </p>
          {!searchTerm && (!customFilters.role || customFilters.role === "all") && (!customFilters.status || customFilters.status === "all") && (
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                {pagination.paginatedItems.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    {/* Usuário */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <UserAvatar
                          userId={user.id}
                          userName={user.name}
                          avatarUrl={user.avatar_url}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-slate-900 dark:text-blue-400">
                                Você
                              </span>
                            )}
                          </div>
                          {user.username && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-slate-900 dark:text-white">{user.email}</div>
                        {user.phone && (
                          <div className="text-slate-500 dark:text-slate-400">{user.phone}</div>
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
                            ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                            : "bg-red-500/20 text-slate-900 dark:text-red-400"
                        }`}
                      >
                        {user.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Último Login */}
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
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
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="rounded-lg bg-slate-200 p-2 text-slate-900 transition-colors hover:bg-slate-300 dark:bg-slate-600/20 dark:text-slate-300 dark:hover:bg-slate-600/30"
                            title="Trocar Senha"
                          >
                            <Key size={16} />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="rounded-lg bg-red-600/20 p-2 text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
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

      {/* Paginação */}
      {!loading && filteredUsers.length > 0 && (
        <Pagination
          {...pagination}
          totalItems={filteredUsers.length}
          itemLabel="usuários"
        />
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
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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

export default Users;
