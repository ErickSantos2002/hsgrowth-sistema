import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Upload, X, User as UserIcon } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Button } from "../common";
import userService from "../../services/userService";
import avatarService from "../../services/avatarService";
import { User, CreateUserRequest, UpdateUserRequest } from "../../types";
import { showSuccess, showError, showWarning } from "../../utils/toast";

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

  // Estados do avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setAvatarFile(null);
    setAvatarPreview(null);
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
   * Remove avatar selecionado
   */
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Faz upload do avatar (apenas para usuários editados)
   */
  const handleUploadAvatar = async () => {
    if (!avatarFile || !isEditing || !user) return;

    try {
      setUploadingAvatar(true);
      await avatarService.uploadAvatar(avatarFile);
      showSuccess("Avatar atualizado com sucesso!");
      setAvatarFile(null);
      setAvatarPreview(null);
      onSave(); // Recarrega lista de usuários
    } catch (error: any) {
      console.error("Erro ao fazer upload de avatar:", error);
      showError(error.response?.data?.detail || "Erro ao fazer upload do avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      showWarning("Email é obrigatório");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showWarning("Email inválido");
      return false;
    }

    if (!name.trim()) {
      showWarning("Nome é obrigatório");
      return false;
    }

    if (!isEditing && !password.trim()) {
      showWarning("Senha é obrigatória ao criar usuário");
      return false;
    }

    if (!isEditing && password.length < 6) {
      showWarning("Senha deve ter pelo menos 6 caracteres");
      return false;
    }

    if (!isEditing && password !== confirmPassword) {
      showWarning("As senhas não coincidem");
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
        showSuccess("Usuário atualizado com sucesso!");
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
        showSuccess("Usuário criado com sucesso!");
      }

      resetForm();
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      const message = error?.response?.data?.detail || "Erro ao salvar usuário";
      showError(message);
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
        {/* Seção de Avatar (apenas para edição) */}
        {isEditing && user && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Foto de Perfil</h3>
            <div className="flex items-center gap-6">
              {/* Preview do Avatar */}
              <div className="relative">
                {avatarPreview || user.avatar_url ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 dark:border-slate-700">
                    <img
                      src={avatarPreview || avatarService.getAvatarUrl(user.id)}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback se a imagem não carregar
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                              <span class="text-2xl font-semibold text-white">${user.name.substring(0, 2).toUpperCase()}</span>
                            </div>
                          `;
                        }
                      }}
                    />
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                        title="Remover foto"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                    <UserIcon size={40} className="text-white" />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  disabled={saving || uploadingAvatar}
                >
                  <Upload size={16} />
                  Selecionar Foto
                </button>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={handleUploadAvatar}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
                    disabled={saving || uploadingAvatar}
                  >
                    {uploadingAvatar ? "Enviando..." : "Salvar Foto"}
                  </button>
                )}
                <p className="text-xs text-slate-400">
                  JPG, PNG, GIF ou WEBP. Máximo 5MB.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Dados de Acesso</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Dados Pessoais</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Permissões</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  { value: "4", label: "SDR" },
                  { value: "5", label: "Visualizador" },
                ]}
                onChange={(value) => setRoleId(Number(value))}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {roleId === 1 && "Acesso total ao sistema"}
                {roleId === 2 && "Gerencia equipes e relatórios"}
                {roleId === 3 && "Gerencia apenas seus próprios cards"}
                {roleId === 4 && "Gerencia prospecção e qualificação de leads"}
                {roleId === 5 && "Acesso somente leitura a boards, clientes, pessoas e produtos"}
              </p>
            </FormField>

            <FormField label="Status">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                  disabled={saving}
                />
                <span className="text-slate-900 dark:text-white">Usuário Ativo</span>
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Usuários inativos não podem fazer login
              </p>
            </FormField>
          </div>
        </div>

        {isEditing && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
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
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
