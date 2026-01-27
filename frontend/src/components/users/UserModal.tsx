import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Button } from "../common";
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      subtitle={isEditing ? "Atualize os dados do usuário" : "Preencha os dados do novo usuário"}
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Dados de Acesso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={
                <span>
                  Email <span className="text-red-400">*</span>
                </span>
              }
              className="md:col-span-2"
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                required
                disabled={saving}
              />
            </FormField>

            {!isEditing && (
              <>
                <FormField
                  label={
                    <span>
                      Senha <span className="text-red-400">*</span>
                    </span>
                  }
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    disabled={saving}
                  />
                </FormField>

                <FormField
                  label={
                    <span>
                      Confirmar Senha <span className="text-red-400">*</span>
                    </span>
                  }
                >
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    required
                    disabled={saving}
                  />
                </FormField>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={
                <span>
                  Nome Completo <span className="text-red-400">*</span>
                </span>
              }
              className="md:col-span-2"
            >
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                required
                disabled={saving}
              />
            </FormField>

            <FormField label="Username">
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="joaosilva"
                disabled={saving}
              />
            </FormField>

            <FormField label="Telefone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                disabled={saving}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Permissões</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={
                <span>
                  Função <span className="text-red-400">*</span>
                </span>
              }
            >
              <SelectMenu
                value={String(roleId)}
                options={[
                  { value: "1", label: "Administrador" },
                  { value: "2", label: "Gerente" },
                  { value: "3", label: "Vendedor" },
                ]}
                onChange={(value) => setRoleId(Number(value))}
              />
              <p className="mt-1 text-xs text-slate-400">
                {roleId === 1 && "Acesso total ao sistema"}
                {roleId === 2 && "Gerencia equipes e relatórios"}
                {roleId === 3 && "Gerencia apenas seus próprios cards"}
              </p>
            </FormField>

            <FormField label="Status">
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
            </FormField>
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
      </form>
    </BaseModal>
  );
};

export default UserModal;

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
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
