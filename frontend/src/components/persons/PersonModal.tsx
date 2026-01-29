import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, Briefcase, Linkedin, Instagram, Facebook, ChevronDown } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Textarea, Button } from "../common";
import personService, { Person, CreatePersonRequest } from "../../services/personService";

/**
 * Props do componente PersonModal
 */
interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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
  email_alternative: string;

  // Telefones
  phone: string;
  phone_commercial: string;
  phone_whatsapp: string;
  phone_alternative: string;

  // Profissional
  position: string;

  // Redes sociais
  linkedin: string;
  instagram: string;
  facebook: string;

  is_active: boolean;
}

/**
 * Aplica máscara de telefone brasileiro
 * (00) 0000-0000 ou (00) 00000-0000
 */
const maskPhone = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

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

  // Estado do formulário
  const [formData, setFormData] = useState<PersonFormData>({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    email_commercial: "",
    email_personal: "",
    email_alternative: "",
    phone: "",
    phone_commercial: "",
    phone_whatsapp: "",
    phone_alternative: "",
    position: "",
    linkedin: "",
    instagram: "",
    facebook: "",
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        email_alternative: person.email_alternative || "",
        phone: person.phone || "",
        phone_commercial: person.phone_commercial || "",
        phone_whatsapp: person.phone_whatsapp || "",
        phone_alternative: person.phone_alternative || "",
        position: person.position || "",
        linkedin: person.linkedin || "",
        instagram: person.instagram || "",
        facebook: person.facebook || "",
        is_active: person.is_active,
      });
    } else {
      // Resetar formulário ao criar novo
      setFormData({
        name: "",
        first_name: "",
        last_name: "",
        email: "",
        email_commercial: "",
        email_personal: "",
        email_alternative: "",
        phone: "",
        phone_commercial: "",
        phone_whatsapp: "",
        phone_alternative: "",
        position: "",
        linkedin: "",
        instagram: "",
        facebook: "",
        is_active: true,
      });
    }
    setError(null);
  }, [person, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setError("Nome completo é obrigatório");
      return false;
    }

    // Validação básica de emails (se preenchidos)
    const emails = [
      formData.email,
      formData.email_commercial,
      formData.email_personal,
      formData.email_alternative,
    ];

    for (const email of emails) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(`Email inválido: ${email}`);
        return false;
      }
    }

    // Validação básica de LinkedIn (se preenchido)
    if (formData.linkedin && !formData.linkedin.includes("linkedin.com")) {
      setError("LinkedIn deve ser uma URL válida do LinkedIn");
      return false;
    }

    return true;
  };

  /**
   * Salva a pessoa (criar ou editar)
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      setError(null);

      // Prepara dados para enviar (remove campos vazios)
      const dataToSend: CreatePersonRequest = {
        name: formData.name.trim(),
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
        email: formData.email.trim() || undefined,
        email_commercial: formData.email_commercial.trim() || undefined,
        email_personal: formData.email_personal.trim() || undefined,
        email_alternative: formData.email_alternative.trim() || undefined,
        phone: formData.phone.replace(/\D/g, "") || undefined, // Remove máscara
        phone_commercial: formData.phone_commercial.replace(/\D/g, "") || undefined,
        phone_whatsapp: formData.phone_whatsapp.replace(/\D/g, "") || undefined,
        phone_alternative: formData.phone_alternative.replace(/\D/g, "") || undefined,
        position: formData.position.trim() || undefined,
        linkedin: formData.linkedin.trim() || undefined,
        instagram: formData.instagram.trim() || undefined,
        facebook: formData.facebook.trim() || undefined,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await personService.update(person.id, dataToSend);
      } else {
        await personService.create(dataToSend);
      }

      onSave(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao salvar pessoa:", err);
      setError(err.response?.data?.detail || "Erro ao salvar pessoa");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para mudança nos campos do formulário
   */
  const handleChange = (field: keyof PersonFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null); // Limpa erro ao editar
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Pessoa" : "Nova Pessoa"}
      subtitle={isEditing ? "Atualize os dados da pessoa" : "Preencha os dados da nova pessoa"}
      size="2xl"
      footer={
        <div className="flex justify-between items-center">
          <div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User size={20} className="text-emerald-400" />
            Identificação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: João Silva Santos"
                autoFocus
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-emerald-400" />
            Informações Profissionais
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {/* Cargo/Posição */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  Cargo/Posição
                </span>
              }
              hint="Cargo ou função na organização"
            >
              <Input
                value={formData.position}
                onChange={(e) => handleChange("position", e.target.value)}
                placeholder="Ex: Gerente de Vendas"
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Emails */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail size={20} className="text-emerald-400" />
            Emails
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Principal */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  Email Principal
                </span>
              }
              hint="Email principal de contato"
            >
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="joao@exemplo.com"
              />
            </FormField>

            {/* Email Comercial */}
            <FormField
              label="Email Comercial"
              hint="Email corporativo/comercial"
            >
              <Input
                type="email"
                value={formData.email_commercial}
                onChange={(e) => handleChange("email_commercial", e.target.value)}
                placeholder="joao@empresa.com"
              />
            </FormField>

            {/* Email Pessoal */}
            <FormField
              label="Email Pessoal"
              hint="Email pessoal"
            >
              <Input
                type="email"
                value={formData.email_personal}
                onChange={(e) => handleChange("email_personal", e.target.value)}
                placeholder="joao.pessoal@gmail.com"
              />
            </FormField>

            {/* Email Alternativo */}
            <FormField
              label="Email Alternativo"
              hint="Email alternativo"
            >
              <Input
                type="email"
                value={formData.email_alternative}
                onChange={(e) => handleChange("email_alternative", e.target.value)}
                placeholder="joao.alt@exemplo.com"
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Telefones */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Phone size={20} className="text-emerald-400" />
            Telefones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  WhatsApp
                </span>
              }
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

            {/* Telefone Principal */}
            <FormField
              label="Telefone Principal"
              hint="Telefone principal"
            >
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Telefone Alternativo */}
            <FormField
              label="Telefone Alternativo"
              hint="Telefone alternativo"
            >
              <Input
                value={formData.phone_alternative}
                onChange={(e) => handleChange("phone_alternative", maskPhone(e.target.value))}
                placeholder="(00) 0000-0000"
                maxLength={15}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Redes Sociais */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
            >
              <Input
                value={formData.linkedin}
                onChange={(e) => handleChange("linkedin", e.target.value)}
                placeholder="https://www.linkedin.com/in/joao-silva"
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
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
              />
              <label htmlFor="is_active" className="text-sm text-slate-300 cursor-pointer">
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
