import React, { useState, useEffect } from "react";
import { Building, User, Mail, Phone, FileText, MapPin, Globe, StickyNote } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Select, Textarea, Button } from "../common";
import clientService, { Client, CreateClientRequest } from "../../services/clientService";

/**
 * Props do componente ClientModal
 */
interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  client: Client | null; // null = criar, objeto = editar
}

/**
 * Interface para os dados do formulário
 */
interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  document: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  notes: string;
  is_active: boolean;
}

/**
 * Estados brasileiros (UF)
 */
const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

/**
 * Aplica máscara de CPF (000.000.000-00)
 */
const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 */
const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * Aplica máscara de CPF ou CNPJ baseado no tamanho
 */
const maskDocument = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");

  // Se tem mais de 11 dígitos, trata como CNPJ
  if (cleaned.length > 11) {
    return maskCNPJ(value);
  }

  // Senão, trata como CPF
  return maskCPF(value);
};

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
 * Modal de Criar/Editar Cliente
 *
 * Formulário completo com todos os campos do cliente, incluindo:
 * - Dados pessoais (nome, email, telefone)
 * - Dados da empresa (nome fantasia, documento)
 * - Endereço (logradouro, cidade, estado, país)
 * - Informações adicionais (website, observações)
 * - Status (ativo/inativo)
 */
const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, client }) => {
  const isEditing = !!client;

  // Estado do formulário
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    document: "",
    address: "",
    city: "",
    state: "",
    country: "Brasil",
    website: "",
    notes: "",
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Preenche o formulário quando estiver editando
   */
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company_name: client.company_name || "",
        document: client.document || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        country: client.country || "Brasil",
        website: client.website || "",
        notes: client.notes || "",
        is_active: client.is_active,
      });
    } else {
      // Resetar formulário ao criar novo
      setFormData({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        document: "",
        address: "",
        city: "",
        state: "",
        country: "Brasil",
        website: "",
        notes: "",
        is_active: true,
      });
    }
    setError(null);
  }, [client, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }

    // Validação básica de email (se preenchido)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email inválido");
      return false;
    }

    // Validação básica de website (se preenchido)
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      setError("Website deve começar com http:// ou https://");
      return false;
    }

    return true;
  };

  /**
   * Salva o cliente (criar ou editar)
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      setError(null);

      // Prepara dados para enviar (remove campos vazios)
      const dataToSend: CreateClientRequest = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.replace(/\D/g, "") || undefined, // Remove máscara
        company_name: formData.company_name.trim() || undefined,
        document: formData.document.replace(/\D/g, "") || undefined, // Remove máscara
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state || undefined,
        country: formData.country.trim() || undefined,
        website: formData.website.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await clientService.update(client.id, dataToSend);
      } else {
        await clientService.create(dataToSend);
      }

      onSave(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao salvar cliente:", err);
      setError(err.response?.data?.detail || "Erro ao salvar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handler para mudança nos campos do formulário
   */
  const handleChange = (field: keyof ClientFormData, value: string | boolean) => {
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
      title={isEditing ? "Editar Cliente" : "Novo Cliente"}
      subtitle={isEditing ? "Atualize os dados do cliente" : "Preencha os dados do novo cliente"}
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
              {isEditing ? "Salvar Alterações" : "Criar Cliente"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Seção: Dados Principais */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User size={20} className="text-emerald-400" />
            Dados Principais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Nome *
                </span>
              }
              hint="Nome completo ou razão social"
            >
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: João Silva"
                autoFocus
              />
            </FormField>

            {/* Nome da Empresa */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Building size={14} />
                  Nome Fantasia
                </span>
              }
              hint="Nome comercial da empresa (se aplicável)"
            >
              <Input
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="Ex: Empresa LTDA"
              />
            </FormField>

            {/* Email */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  Email
                </span>
              }
              hint="Endereço de email principal"
            >
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Ex: joao@empresa.com"
              />
            </FormField>

            {/* Telefone */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  Telefone
                </span>
              }
              hint="Telefone com DDD"
            >
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* Documento (CPF/CNPJ) */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  CPF/CNPJ
                </span>
              }
              hint="Documento de identificação"
            >
              <Input
                value={formData.document}
                onChange={(e) => handleChange("document", maskDocument(e.target.value))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Endereço */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-400" />
            Endereço
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logradouro */}
            <FormField
              label="Logradouro"
              hint="Rua, avenida, número"
              className="md:col-span-2"
            >
              <Input
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Ex: Rua das Flores, 123"
              />
            </FormField>

            {/* Cidade */}
            <FormField label="Cidade" hint="Nome da cidade">
              <Input
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </FormField>

            {/* Estado */}
            <FormField label="Estado" hint="UF">
              <Select
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              >
                <option value="">Selecione...</option>
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label} ({state.value})
                  </option>
                ))}
              </Select>
            </FormField>

            {/* País */}
            <FormField label="País" hint="País de origem">
              <Input
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Ex: Brasil"
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Informações Adicionais */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe size={20} className="text-emerald-400" />
            Informações Adicionais
          </h3>
          <div className="space-y-4">
            {/* Website */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <Globe size={14} />
                  Website
                </span>
              }
              hint="Endereço do site (incluir http:// ou https://)"
            >
              <Input
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://www.exemplo.com.br"
              />
            </FormField>

            {/* Observações */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  <StickyNote size={14} />
                  Observações
                </span>
              }
              hint="Informações adicionais sobre o cliente"
            >
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Informações relevantes sobre o cliente..."
                rows={4}
              />
            </FormField>

            {/* Status Ativo/Inativo */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
              />
              <label htmlFor="is_active" className="text-sm text-slate-300 cursor-pointer">
                Cliente ativo (desmarque para inativar)
              </label>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ClientModal;
