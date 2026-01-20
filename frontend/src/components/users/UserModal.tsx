import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import userService from "../../services/userService";
import { User, CreateUserRequest, UpdateUserRequest } from "../../types";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: User | null;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleId, setRoleId] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (isEditing && user) {
      setEmail(user.email);
      setName(user.name);
      setUsername(user.username || "");
      setPhone(user.phone || "");
      setPassword("");
      setConfirmPassword("");
      setRoleId(user.role_id);
      setIsActive(user.is_active);
    } else {
      resetForm();
    }
  }, [user, isEditing]);

  const resetForm = () => {
    setEmail("");
    setName("");
    setUsername("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setRoleId(3);
    setIsActive(true);
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      alert("Email é obrigatório");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Email inválido");
      return false;
    }

    if (!name.trim()) {
      alert("Nome é obrigatório");
      return false;
    }

    if (!isEditing && !password.trim()) {
      alert("Senha é obrigatória ao criar usuário");
      return false;
    }

    if (!isEditing && password.length < 6) {
      alert("Senha deve ter pelo menos 6 caracteres");
      return false;
    }

    if (!isEditing && password !== confirmPassword) {
      alert("As senhas não coincidem");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      if (isEditing && user) {
        const data: UpdateUserRequest = {
          email: email.trim(),
          name: name.trim(),
          username: username.trim() || undefined,
          phone: phone.trim() || undefined,
          role_id: roleId,
          is_active: isActive,
        };

        await userService.update(user.id, data);
        alert("Usuário atualizado com sucesso!");
      } else {
        const data: CreateUserRequest = {
          email: email.trim(),
          password: password,
          name: name.trim(),
          username: username.trim() || undefined,
          phone: phone.trim() || undefined,
          role_id: roleId,
          is_active: isActive,
        };

        await userService.create(data);
        alert("Usuário criado com sucesso!");
      }

      resetForm();
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      const message = error?.response?.data?.detail || "Erro ao salvar usuário";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Dados de Acesso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="usuario@exemplo.com"
                  required
                  disabled={saving}
                />
              </div>

              {!isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Senha <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar Senha <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Digite a senha novamente"
                      required
                      disabled={saving}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome Completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="João Silva"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="joaosilva"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="(11) 98765-4321"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Permissões</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Função <span className="text-red-400">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  disabled={saving}
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Gerente</option>
                  <option value={3}>Vendedor</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {roleId === 1 && "Acesso total ao sistema"}
                  {roleId === 2 && "Gerencia equipes e relatórios"}
                  {roleId === 3 && "Gerencia apenas seus próprios cards"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    disabled={saving}
                  />
                  <span className="text-white">Usuário Ativo</span>
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Usuários inativos não podem fazer login
                </p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Nota:</strong> Para alterar a senha, o usuário deve fazer isso através
                da página de configurações após fazer login.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
