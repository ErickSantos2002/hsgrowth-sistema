import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, Briefcase, Linkedin, Instagram, Facebook, ChevronDown, Users } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";
import personService, { Person, CreatePersonRequest } from "../../services/personService";
import userService from "../../services/userService";
import { User as UserType } from "../../types";
import { PERSON_AREAS } from "../../constants/blueprintOptions";
import { maskPhone } from "../../utils/formatters";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";

/**
 * Props do componente PersonModal
 */
interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Na criação, recebe a pessoa criada. Na edição, chamado sem argumento. */
  onSave: (person?: Person) => void;
  person: Person | null; // null = criar, objeto = editar
}

/**
 * Interface para os dados do formulário
 */
interface PersonFormData {
  name: string;
  first_name: string;
  last_name: string;

  // Emails
  email: string;
  email_commercial: string;
  email_personal: string;

  // Telefones
  phone: string;
  phone_commercial: string;
  phone_whatsapp: string;
  phone_alternative: string;
  phone_extra1: string;
  phone_extra2: string;

  // Profissional
  position: string;
  area: string;
  owner_id: number | null;

  // Redes sociais
  linkedin: string;
  instagram: string;
  facebook: string;

  is_active: boolean;
}

/**
 * Modal de Criar/Editar Pessoa
 *
 * Formulário completo com todos os campos de pessoa, incluindo:
 * - Nome completo e separado (primeiro nome, sobrenome)
 * - Múltiplos emails (principal, comercial, pessoal, alternativo)
 * - Múltiplos telefones (principal, comercial, WhatsApp, alternativo)
 * - Informações profissionais (cargo)
 * - Redes sociais (LinkedIn, Instagram, Facebook)
 * - Status (ativo/inativo)
 */
const PersonModal: React.FC<PersonModalProps> = ({ isOpen, onClose, onSave, person }) => {
  const isEditing = !!person;
  const { user } = useAuth();

  // Estado do formulário — owner_id inicia com o usuário logado na criação
  const [formData, setFormData] = useState<PersonFormData>({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    email_commercial: "",
    email_personal: "",
    phone: "",
    phone_commercial: "",
    phone_whatsapp: "",
    phone_alternative: "",
    phone_extra1: "",
    phone_extra2: "",
    position: "",
    area: "",
    owner_id: user?.id ?? null,
    linkedin: "",
    instagram: "",
    facebook: "",
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  // Erros por campo — cada chave corresponde a um campo do formulário
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<UserType[]>([]);

  /**
   * Carrega usuários ativos para o dropdown de proprietário
   */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const activeUsers = await userService.listActive();
        // Exibe apenas vendedores como opção de proprietário
        setUsers(activeUsers.filter((u) => u.role === "salesperson"));
      } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        showError("Erro ao carregar lista de usuários. Tente novamente.");
      }
    };

    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  /**
   * Preenche o formulário quando estiver editando
   */
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || "",
        first_name: person.first_name || "",
        last_name: person.last_name || "",
        email: person.email || "",
        email_commercial: person.email_commercial || "",
        email_personal: person.email_personal || "",
        phone: person.phone || "",
        phone_commercial: person.phone_commercial || "",
        phone_whatsapp: person.phone_whatsapp || "",
        phone_alternative: person.phone_alternative || "",
        phone_extra1: person.phone_extra1 || "",
        phone_extra2: person.phone_extra2 || "",
        position: person.position || "",
        area: person.area || "",
        owner_id: person.owner_id || null,
        linkedin: person.linkedin || "",
        instagram: person.instagram || "",
        facebook: person.facebook || "",
        is_active: person.is_active,
      });
    } else {
      // Resetar formulário ao criar novo — owner_id pré-preenchido com o usuário logado
      setFormData({
        name: "",
        first_name: "",
        last_name: "",
        email: "",
        email_commercial: "",
        email_personal: "",
        phone: "",
        phone_commercial: "",
        phone_whatsapp: "",
        phone_alternative: "",
        phone_extra1: "",
        phone_extra2: "",
        position: "",
        area: "",
        owner_id: user?.id ?? null,
        linkedin: "",
        instagram: "",
        facebook: "",
        is_active: true,
      });
    }
    setErrors({});
  }, [person, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      next.name = "Nome completo é obrigatório";
    }

    // Validação de cada email individualmente (se preenchido)
    if (formData.email && !emailRegex.test(formData.email)) {
      next.email = "Email inválido";
    }
    if (formData.email_commercial && !emailRegex.test(formData.email_commercial)) {
      next.email_commercial = "Email inválido";
    }
    if (formData.email_personal && !emailRegex.test(formData.email_personal)) {
      next.email_personal = "Email inválido";
    }

    // Validação básica de LinkedIn (se preenchido)
    if (formData.linkedin && !formData.linkedin.includes("linkedin.com")) {
      next.linkedin = "LinkedIn deve ser uma URL válida do LinkedIn";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * Salva a pessoa (criar ou editar)
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      setErrors({});

      // Prepara dados para enviar
      // Envia null explicitamente para campos vazios (permite limpar no backend)
      const dataToSend: CreatePersonRequest = {
        name: formData.name.trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        email_commercial: formData.email_commercial.trim() || null,
        email_personal: formData.email_personal.trim() || null,
        phone: formData.phone.replace(/\D/g, "") || null, // Remove máscara
        phone_commercial: formData.phone_commercial.replace(/\D/g, "") || null,
        phone_whatsapp: formData.phone_whatsapp.replace(/\D/g, "") || null,
        phone_alternative: formData.phone_alternative.replace(/\D/g, "") || null,
        phone_extra1: formData.phone_extra1.replace(/\D/g, "") || null,
        phone_extra2: formData.phone_extra2.replace(/\D/g, "") || null,
        position: formData.position.trim() || null,
        area: formData.area.trim() || null,
        owner_id: formData.owner_id || null,
        linkedin: formData.linkedin.trim() || null,
        instagram: formData.instagram.trim() || null,
        facebook: formData.facebook.trim() || null,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await personService.update(person.id, dataToSend);
        onSave(); // Edição: sem argumento, apenas sinaliza que terminou
      } else {
        // Criação: captura a pessoa retornada pela API e repassa via callback
        // para que o chamador possa vinculá-la diretamente pelo ID correto
        const created = await personService.create(dataToSend);
        onSave(created);
      }
      onClose(); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao salvar pessoa:", err);
      setErrors({ _api: err.response?.data?.detail || "Erro ao salvar pessoa" });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para mudança nos campos do formulário
   */
  const handleChange = (field: keyof PersonFormData, value: string | boolean | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpa o erro do campo editado
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Pessoa" : "Nova Pessoa"}
      subtitle={isEditing ? "Atualize os dados da pessoa" : "Preencha os dados da nova pessoa"}
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div>
            {errors._api && (
              <p className="text-sm text-red-400">{errors._api}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              {isEditing ? "Salvar Alterações" : "Criar Pessoa"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Seção: Identificação */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <User size={20} className="text-emerald-400" />
            Identificação
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nome Completo */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Nome Completo *
                </span>
              }
              hint="Nome completo da pessoa"
              className="md:col-span-2"
              error={errors.name}
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: João Silva Santos"
                autoFocus
                error={!!errors.name}
              />
            </FormField>

            {/* Primeiro Nome */}
            <FormField
              label="Primeiro Nome"
              hint="Primeiro nome (opcional)"
            >
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="Ex: João"
              />
            </FormField>

            {/* Sobrenome */}
            <FormField
              label="Sobrenome"
              hint="Sobrenome (opcional)"
            >
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Ex: Silva Santos"
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Informações Profissionais */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Briefcase size={20} className="text-emerald-400" />
            Informações Profissionais
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Cargo/Posição */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  Cargo/Posição
                </span>
              }
              hint="Cargo ou função na organização"
              className="md:col-span-2"
            >
              <Input
                value={formData.position}
                onChange={(e) => handleChange("position", e.target.value)}
                placeholder="Ex: Gerente de Vendas"
              />
            </FormField>

            {/* Área/Departamento */}
            <FormField
              label="Área/Departamento"
              hint="Área de atuação dentro da organização"
            >
              <SelectMenu
                value={formData.area}
                options={[
                  { value: "", label: "Selecione..." },
                  ...PERSON_AREAS.map((area) => ({ value: area, label: area })),
                ]}
                onChange={(value) => handleChange("area", value)}
              />
            </FormField>

            {/* Proprietário */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  Proprietário
                </span>
              }
              hint="Responsável por esta pessoa"
            >
              <SelectMenu
                value={formData.owner_id?.toString() || ""}
                options={[
                  { value: "", label: "Nenhum" },
                  ...users.map((user) => ({ value: String(user.id), label: user.name })),
                ]}
                onChange={(value) =>
                  handleChange("owner_id", value ? parseInt(value) : null)
                }
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Emails */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Mail size={20} className="text-emerald-400" />
            Emails
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Email Principal */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  Email Principal
                </span>
              }
              hint="Email principal de contato"
              error={errors.email}
            >
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="joao@exemplo.com"
                error={!!errors.email}
              />
            </FormField>

            {/* Email Comercial */}
            <FormField
              label="Email Comercial"
              hint="Email corporativo/comercial"
              error={errors.email_commercial}
            >
              <Input
                type="email"
                value={formData.email_commercial}
                onChange={(e) => handleChange("email_commercial", e.target.value)}
                placeholder="joao@empresa.com"
                error={!!errors.email_commercial}
              />
            </FormField>

            {/* Email Pessoal */}
            <FormField
              label="Email Pessoal"
              hint="Email pessoal"
              className="md:col-span-2"
              error={errors.email_personal}
            >
              <Input
                type="email"
                value={formData.email_personal}
                onChange={(e) => handleChange("email_personal", e.target.value)}
                placeholder="joao.pessoal@gmail.com"
                error={!!errors.email_personal}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Telefones */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Phone size={20} className="text-emerald-400" />
            Telefones
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Telefone Principal */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  Telefone Principal
                </span>
              }
              hint="Telefone principal"
            >
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* WhatsApp */}
            <FormField
              label="WhatsApp"
              hint="Número do WhatsApp"
            >
              <Input
                value={formData.phone_whatsapp}
                onChange={(e) => handleChange("phone_whatsapp", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Telefone Comercial */}
            <FormField
              label="Telefone Comercial"
              hint="Telefone corporativo"
            >
              <Input
                value={formData.phone_commercial}
                onChange={(e) => handleChange("phone_commercial", maskPhone(e.target.value))}
                placeholder="(00) 0000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Telefone Alternativo */}
            <FormField
              label="Telefone Alternativo"
              hint="Outro número de contato"
            >
              <Input
                value={formData.phone_alternative}
                onChange={(e) => handleChange("phone_alternative", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Telefone Extra 1 */}
            <FormField
              label="Telefone Extra 1"
              hint="Número adicional"
            >
              <Input
                value={formData.phone_extra1}
                onChange={(e) => handleChange("phone_extra1", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Telefone Extra 2 */}
            <FormField
              label="Telefone Extra 2"
              hint="Número adicional"
            >
              <Input
                value={formData.phone_extra2}
                onChange={(e) => handleChange("phone_extra2", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Redes Sociais */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Linkedin size={20} className="text-emerald-400" />
            Redes Sociais
          </h3>
          <div className="space-y-4">
            {/* LinkedIn */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Linkedin size={14} />
                  LinkedIn
                </span>
              }
              hint="URL do perfil no LinkedIn"
              error={errors.linkedin}
            >
              <Input
                value={formData.linkedin}
                onChange={(e) => handleChange("linkedin", e.target.value)}
                placeholder="https://www.linkedin.com/in/joao-silva"
                error={!!errors.linkedin}
              />
            </FormField>

            {/* Instagram */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Instagram size={14} />
                  Instagram
                </span>
              }
              hint="Username ou URL do Instagram"
            >
              <Input
                value={formData.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="@joaosilva ou https://instagram.com/joaosilva"
              />
            </FormField>

            {/* Facebook */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Facebook size={14} />
                  Facebook
                </span>
              }
              hint="URL do perfil no Facebook"
            >
              <Input
                value={formData.facebook}
                onChange={(e) => handleChange("facebook", e.target.value)}
                placeholder="https://www.facebook.com/joaosilva"
              />
            </FormField>

            {/* Status Ativo/Inativo */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <label htmlFor="is_active" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                Pessoa ativa (desmarque para inativar)
              </label>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default PersonModal;

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
  disabled?: boolean;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}) => {
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

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
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
