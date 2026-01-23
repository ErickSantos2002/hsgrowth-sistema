import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, RefreshCw, Shield, UserCircle, Clock, Key } from "lucide-react";
import userService from "../services/userService";
import { User } from "../types";
import { useAuth } from "../hooks/useAuth";
import UserModal from "../components/users/UserModal";
import AdminPasswordResetModal from "../components/users/AdminPasswordResetModal";

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all"); // all, admin, manager, salesperson
  const [filterActive, setFilterActive] = useState<string>("all"); // all, active, inactive
  const [showFilters, setShowFilters] = useState(false);

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
      alert("Erro ao carregar usuários");
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
      alert("Apenas administradores podem criar usuários");
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
      alert("Apenas administradores podem editar usuários");
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
      alert("Apenas administradores podem deletar usuários");
      return;
    }

    if (user.id === currentUser?.id) {
      alert("Você não pode deletar seu próprio usuário");
      return;
    }

    if (confirm(`Tem certeza que deseja deletar o usuário "${user.name}"?`)) {
      try {
        await userService.delete(user.id);
        await loadUsers();
        alert("Usuário deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        alert("Erro ao deletar usuário");
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
      alert("Apenas administradores podem resetar senhas");
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
        alert(
          `Senha resetada com sucesso!\n\nSenha temporária gerada:\n${response.temporary_password}\n\nCopie esta senha e envie para o usuário ${resetPasswordUser.name}.`
        );
      } else {
        alert(`Senha de ${resetPasswordUser.name} foi resetada com sucesso!`);
      }

      setShowPasswordResetModal(false);
      setResetPasswordUser(null);
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error);
      alert(
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
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-4">
            <Shield size={64} className="mx-auto text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <UserCircle className="text-white" size={32} />
              Usuários
            </h1>
            <p className="text-slate-400 mt-1">Gerencie os usuários do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de busca */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome, email ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="salesperson">Vendedor</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Status</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-400">
        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""} encontrado
        {filteredUsers.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de usuários */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando usuários...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <p className="text-slate-400 mb-4">
            {searchTerm || filterRole !== "all" || filterActive !== "all"
              ? "Nenhum usuário encontrado com os filtros aplicados"
              : "Nenhum usuário cadastrado ainda"}
          </p>
          {!searchTerm && filterRole === "all" && filterActive === "all" && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Cadastrar Primeiro Usuário
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Usuário */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
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
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
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
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                          title="Trocar Senha"
                        >
                          <Key size={16} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400"
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

export default Users;
