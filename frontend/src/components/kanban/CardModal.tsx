import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Calendar,
  User as UserIcon,
  Building2,
  Search,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Radio,
} from "lucide-react";
import { Card, List } from "../../types";
import { BaseModal, FormField, Input, Select, Textarea, Button } from "../common";
import userService from "../../services/userService";
import clientService, { Client } from "../../services/clientService";
import personService, { Person } from "../../services/personService";
import ClientModal from "../clients/ClientModal";
import PersonModal from "../persons/PersonModal";
import { User as UserType } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { DEAL_TYPES, ACQUISITION_CHANNELS } from "../../constants/blueprintOptions";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (_data: CardFormData) => void;
  card?: Card | null;
  lists: List[];
  currentListId: number;
  title: string;
}

export interface CardFormData {
  list_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  assigned_to_id?: number | null;
  sdr_id?: number | null;
  contact_info?: Record<string, any> | null;

  // Campos obrigatórios na criação
  deal_type?: string;
  acquisition_channel?: string;
  client_id?: number | null;
  person_id?: number | null;
}

/** Erros de validação do formulário */
interface FormErrors {
  title?: string;
  deal_type?: string;
  acquisition_channel?: string;
  client?: string;
  person?: string;
}

/**
 * Modal para criar ou editar cards (oportunidades/negócios).
 *
 * Em modo criação: exige Tipo de Negócio, Canal de Aquisição,
 * empresa vinculada (com setor e relacionamento) e contato vinculado
 * (com e-mail ou telefone).
 *
 * Em modo edição: exibe apenas os campos básicos do card (empresa
 * e contato são gerenciados no CardDetails).
 */
const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card,
  lists,
  currentListId,
  title,
}) => {
  const { user: currentUser } = useAuth();
  const isCreating = !card;

  // ─── Campos básicos do card ───────────────────────────────────────────────
  const [formData, setFormData] = useState<CardFormData>({
    list_id: currentListId,
    title: "",
    description: "",
    due_date: "",
    assigned_to_id: undefined,
    sdr_id: undefined,
    deal_type: "",
    acquisition_channel: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // ─── Usuários ─────────────────────────────────────────────────────────────
  const [salespeople, setSalespeople] = useState<UserType[]>([]);
  const [sdrs, setSDRs] = useState<UserType[]>([]);

  const isSalesperson = currentUser?.role?.toLowerCase() === "salesperson";
  const isSDR = currentUser?.role?.toLowerCase() === "sdr";
  // Admin e Manager podem escolher qualquer lista; demais roles ficam travados em "Prospecção"
  const isPrivileged =
    currentUser?.role?.toLowerCase() === "admin" ||
    currentUser?.role?.toLowerCase() === "manager";

  // ─── Empresa ──────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // ─── Contato ──────────────────────────────────────────────────────────────
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState<Person[]>([]);
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showCreatePersonModal, setShowCreatePersonModal] = useState(false);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);
  const personSearchRef = useRef<HTMLDivElement>(null);

  // ─── Fechar dropdowns ao clicar fora ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (personSearchRef.current && !personSearchRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Busca de empresas com debounce ───────────────────────────────────────
  useEffect(() => {
    if (!clientSearch.trim() || !showClientDropdown) {
      setClientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingClients(true);
        const response = await clientService.list({
          page_size: 50,
          is_active: true,
          search: clientSearch.trim(),
        });
        setClientResults(response.clients);
      } catch {
        // Falha silenciosa — o campo continua usável
      } finally {
        setIsSearchingClients(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [clientSearch, showClientDropdown]);

  // ─── Busca de contatos com debounce ───────────────────────────────────────
  useEffect(() => {
    if (!personSearch.trim() || !showPersonDropdown) {
      setPersonResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingPersons(true);
        const response = await personService.list({
          page_size: 50,
          is_active: true,
          search: personSearch.trim(),
        });
        setPersonResults(response.persons);
      } catch {
        // Falha silenciosa
      } finally {
        setIsSearchingPersons(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [personSearch, showPersonDropdown]);

  // ─── Reset ao abrir/fechar ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      loadUsers();

      if (card) {
        // Modo edição: preenche com dados existentes
        let dueDateFormatted = "";
        if (card.due_date) {
          dueDateFormatted = new Date(card.due_date).toISOString().split("T")[0];
        }
        setFormData({
          list_id: card.list_id,
          title: card.title,
          description: card.description || "",
          due_date: dueDateFormatted,
          assigned_to_id: card.assigned_to_id || undefined,
          sdr_id: card.sdr_id || undefined,
          deal_type: card.deal_type || "",
          acquisition_channel: card.acquisition_channel || "",
        });
      } else {
        // Modo criação: reset completo
        setFormData({
          list_id: currentListId,
          title: "",
          description: "",
          due_date: "",
          assigned_to_id: isSalesperson ? currentUser?.id : undefined,
          sdr_id: isSDR ? currentUser?.id : undefined,
          deal_type: "",
          acquisition_channel: "",
        });
        setSelectedClient(null);
        setSelectedPerson(null);
        setClientSearch("");
        setPersonSearch("");
      }
      setErrors({});
    }
  }, [card, currentListId, isOpen, currentUser?.id, isSDR, isSalesperson]);

  /** Carrega e filtra usuários por role */
  const loadUsers = async () => {
    try {
      const activeUsers = await userService.listActive();
      setSalespeople(activeUsers.filter((u) => u.role === "salesperson"));
      setSDRs(activeUsers.filter((u) => u.role === "sdr"));
    } catch {
      showError("Erro ao carregar lista de usuários. Tente novamente.");
    }
  };

  // ─── Helpers de validação ─────────────────────────────────────────────────

  /** Verifica se a empresa tem setor e relacionamento preenchidos */
  const isClientComplete = (c: Client) =>
    !!(c.sector && c.relationship_type);

  /** Verifica se o contato tem pelo menos um e-mail ou telefone */
  const isPersonComplete = (p: Person) =>
    !!(p.email || p.email_commercial || p.phone || p.phone_whatsapp || p.phone_commercial);

  // ─── Handlers de empresa ──────────────────────────────────────────────────

  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setShowClientDropdown(false);
    setClientSearch("");
    // Remove erro de empresa ao selecionar
    setErrors((prev) => ({ ...prev, client: undefined }));
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setClientSearch("");
  };

  /** Callback do ClientModal após criar nova empresa */
  const handleClientCreated = (newClient?: Client) => {
    setShowCreateClientModal(false);
    if (newClient) {
      setSelectedClient(newClient);
      setErrors((prev) => ({ ...prev, client: undefined }));
    }
  };

  /** Callback do ClientModal após editar empresa existente */
  const handleClientEdited = (updatedClient?: Client) => {
    setShowEditClientModal(false);
    if (updatedClient) {
      setSelectedClient(updatedClient);
    }
  };

  // ─── Handlers de contato ──────────────────────────────────────────────────

  const handleSelectPerson = (p: Person) => {
    setSelectedPerson(p);
    setShowPersonDropdown(false);
    setPersonSearch("");
    setErrors((prev) => ({ ...prev, person: undefined }));
  };

  const handleRemovePerson = () => {
    setSelectedPerson(null);
    setPersonSearch("");
  };

  /** Callback do PersonModal após criar novo contato */
  const handlePersonCreated = (newPerson?: Person) => {
    setShowCreatePersonModal(false);
    if (newPerson) {
      setSelectedPerson(newPerson);
      setErrors((prev) => ({ ...prev, person: undefined }));
    }
  };

  /** Callback do PersonModal após editar contato existente */
  const handlePersonEdited = () => {
    setShowEditPersonModal(false);
    // Recarrega os dados atualizados da pessoa selecionada
    if (selectedPerson) {
      personService.getById(selectedPerson.id).then((updated) => {
        setSelectedPerson(updated);
      });
    }
  };

  // ─── Validação ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Título do card é obrigatório";
    }

    if (isCreating) {
      if (!formData.deal_type) {
        newErrors.deal_type = "Tipo de negócio é obrigatório";
      }
      if (!formData.acquisition_channel) {
        newErrors.acquisition_channel = "Canal de aquisição é obrigatório";
      }
      if (!selectedClient) {
        newErrors.client = "Vincule uma empresa antes de criar o card";
      } else if (!isClientComplete(selectedClient)) {
        newErrors.client =
          "A empresa selecionada não tem Setor e/ou Tipo de Relacionamento. Complete os dados.";
      }
      if (!selectedPerson) {
        newErrors.person = "Vincule um contato antes de criar o card";
      } else if (!isPersonComplete(selectedPerson)) {
        newErrors.person =
          "O contato selecionado não tem e-mail ou telefone. Complete os dados.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      ...formData,
      title: formData.title.trim(),
      client_id: selectedClient?.id ?? null,
      person_id: selectedPerson?.id ?? null,
    };

    // Garante que SDR nunca envie assigned_to_id (nem em edições de cards
    // que já tinham responsável — o valor existente vaza via formData).
    // Salesperson nunca envia sdr_id pelo mesmo motivo.
    if (isSDR) delete payload.assigned_to_id;
    if (isSalesperson) delete payload.sdr_id;

    onSave(payload);
    onClose();
  };

  // ─── Helpers de exibição ──────────────────────────────────────────────────

  const formatDocument = (doc?: string) => {
    if (!doc) return "";
    const n = doc.replace(/\D/g, "");
    if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return doc;
  };

  const getPersonContact = (p: Person) =>
    p.email || p.email_commercial || p.phone || p.phone_whatsapp || "";

  // ─── Botão submit desabilitado ─────────────────────────────────────────────

  const isSubmitDisabled = !formData.title.trim() ||
    (isCreating && (!formData.deal_type || !formData.acquisition_channel || !selectedClient || !selectedPerson));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={
          card
            ? "Edite as informações do card"
            : "Preencha todos os campos obrigatórios para criar o negócio"
        }
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {card ? "Salvar Alterações" : "Criar Card"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Seção: Informações Básicas ── */}
          <div className="space-y-4">
            {/* Lista de destino */}
            <FormField
              label="Lista"
              hint={
                isPrivileged
                  ? "Selecione em qual lista o card será criado"
                  : "Vendedores e SDRs só podem criar cards na lista Prospecção"
              }
            >
              <Select
                value={formData.list_id}
                onChange={(e) =>
                  setFormData({ ...formData, list_id: Number(e.target.value) })
                }
                disabled={!isPrivileged}
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Título */}
            <FormField label="Título do Card" required error={errors.title}>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Proposta - Empresa XYZ"
                error={!!errors.title}
                autoFocus
              />
            </FormField>
          </div>

          {/* ── Seção: Informações do Negócio ── */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Tag size={14} />
              Informações do Negócio
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Tipo de Negócio"
                required={isCreating}
                error={errors.deal_type}
              >
                <Select
                  value={formData.deal_type ?? ""}
                  onChange={(e) => {
                    setFormData({ ...formData, deal_type: e.target.value });
                    if (e.target.value) setErrors((prev) => ({ ...prev, deal_type: undefined }));
                  }}
                  error={!!errors.deal_type}
                >
                  <option value="">Selecione...</option>
                  {DEAL_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Canal de Aquisição"
                required={isCreating}
                error={errors.acquisition_channel}
              >
                <Select
                  value={formData.acquisition_channel ?? ""}
                  onChange={(e) => {
                    setFormData({ ...formData, acquisition_channel: e.target.value });
                    if (e.target.value) setErrors((prev) => ({ ...prev, acquisition_channel: undefined }));
                  }}
                  error={!!errors.acquisition_channel}
                >
                  <option value="">Selecione...</option>
                  {ACQUISITION_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>

          {/* ── Seção: Empresa (apenas criação) ── */}
          {isCreating && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Building2 size={14} />
                Empresa (Organização) <span className="text-red-400">*</span>
              </h3>

              {selectedClient ? (
                /* Empresa selecionada — exibe chip */
                <div className="space-y-2">
                  <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                    isClientComplete(selectedClient)
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isClientComplete(selectedClient) ? (
                          <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                        )}
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {selectedClient.company_name || selectedClient.name}
                        </p>
                      </div>
                      {selectedClient.document && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDocument(selectedClient.document)}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {selectedClient.sector ? (
                          <span className="rounded bg-slate-700/50 px-2 py-0.5 text-slate-300">
                            {selectedClient.sector}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
                            Setor não informado
                          </span>
                        )}
                        {selectedClient.relationship_type ? (
                          <span className="rounded bg-slate-700/50 px-2 py-0.5 text-slate-300">
                            {selectedClient.relationship_type}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
                            Relacionamento não informado
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveClient}
                      className="shrink-0 rounded p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remover empresa"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Aviso quando empresa não tem campos obrigatórios */}
                  {!isClientComplete(selectedClient) && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-400">
                        Complete o Setor e o Tipo de Relacionamento para continuar.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowEditClientModal(true)}
                        className="shrink-0 text-xs font-medium text-amber-400 underline hover:text-amber-300"
                      >
                        Editar empresa
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Nenhuma empresa — busca ou cadastra */
                <div className="space-y-2" ref={clientSearchRef}>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Buscar empresa por nome ou CNPJ..."
                      className={`w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                        errors.client
                          ? "border-red-500/60 bg-red-500/5 focus:ring-red-500/30"
                          : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-emerald-500/30"
                      }`}
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => { setClientSearch(""); setClientResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Dropdown de resultados */}
                    {showClientDropdown && clientSearch.trim() && (
                      <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                        {isSearchingClients ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            Buscando empresas...
                          </p>
                        ) : clientResults.length === 0 ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            Nenhuma empresa encontrada
                          </p>
                        ) : (
                          clientResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              className="w-full px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {c.company_name || c.name}
                              </p>
                              {c.document && (
                                <p className="text-xs text-slate-400">{formatDocument(c.document)}</p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botão cadastrar nova empresa */}
                  <button
                    type="button"
                    onClick={() => setShowCreateClientModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-2 text-sm text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    <Plus size={14} />
                    Cadastrar nova empresa
                  </button>

                  {errors.client && (
                    <p className="text-xs text-red-400">{errors.client}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Seção: Contato (apenas criação) ── */}
          {isCreating && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <UserIcon size={14} />
                Contato (Pessoa) <span className="text-red-400">*</span>
              </h3>

              {selectedPerson ? (
                /* Contato selecionado — exibe chip */
                <div className="space-y-2">
                  <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                    isPersonComplete(selectedPerson)
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isPersonComplete(selectedPerson) ? (
                          <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                        )}
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {selectedPerson.name}
                        </p>
                      </div>
                      {selectedPerson.position && (
                        <p className="mt-0.5 text-xs text-slate-400">{selectedPerson.position}</p>
                      )}
                      {getPersonContact(selectedPerson) ? (
                        <p className="mt-1 text-xs text-blue-400">
                          {getPersonContact(selectedPerson)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-amber-400">Sem e-mail ou telefone</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePerson}
                      className="shrink-0 rounded p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remover contato"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Aviso quando contato não tem e-mail ou telefone */}
                  {!isPersonComplete(selectedPerson) && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-400">
                        Adicione um e-mail ou telefone ao contato para continuar.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowEditPersonModal(true)}
                        className="shrink-0 text-xs font-medium text-amber-400 underline hover:text-amber-300"
                      >
                        Editar contato
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Nenhum contato — busca ou cadastra */
                <div className="space-y-2" ref={personSearchRef}>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={personSearch}
                      onChange={(e) => {
                        setPersonSearch(e.target.value);
                        setShowPersonDropdown(true);
                      }}
                      onFocus={() => setShowPersonDropdown(true)}
                      placeholder="Buscar contato por nome, e-mail ou telefone..."
                      className={`w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                        errors.person
                          ? "border-red-500/60 bg-red-500/5 focus:ring-red-500/30"
                          : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-emerald-500/30"
                      }`}
                    />
                    {personSearch && (
                      <button
                        type="button"
                        onClick={() => { setPersonSearch(""); setPersonResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Dropdown de resultados */}
                    {showPersonDropdown && personSearch.trim() && (
                      <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                        {isSearchingPersons ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            Buscando contatos...
                          </p>
                        ) : personResults.length === 0 ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            Nenhum contato encontrado
                          </p>
                        ) : (
                          personResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPerson(p)}
                              className="w-full px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {p.name}
                              </p>
                              {p.position && (
                                <p className="text-xs text-slate-400">{p.position}</p>
                              )}
                              {(p.email || p.email_commercial) && (
                                <p className="text-xs text-blue-400">
                                  {p.email || p.email_commercial}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botão cadastrar novo contato */}
                  <button
                    type="button"
                    onClick={() => setShowCreatePersonModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-2 text-sm text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    <Plus size={14} />
                    Cadastrar novo contato
                  </button>

                  {errors.person && (
                    <p className="text-xs text-red-400">{errors.person}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Seção: Detalhes (data e responsáveis) ── */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Radio size={14} />
              Detalhes
            </h3>
            <div className="space-y-4">
              <FormField
                label={
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Data de Vencimento
                  </span>
                }
                hint="Quando esta oportunidade expira"
              >
                <Input
                  type="date"
                  value={formData.due_date ?? ""}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <UserIcon size={14} />
                      Responsável SDR
                    </span>
                  }
                  hint={
                    isSDR
                      ? "Você será automaticamente o responsável SDR"
                      : isSalesperson
                      ? "Vendedor não pode atribuir SDR"
                      : "SDR responsável pela prospecção"
                  }
                >
                  <Select
                    value={formData.sdr_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sdr_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    disabled={isSalesperson || isSDR}
                  >
                    <option value="">Nenhum SDR</option>
                    {sdrs.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label={
                    <span className="flex items-center gap-1">
                      <UserIcon size={14} />
                      Responsável Vendedor
                    </span>
                  }
                  hint={
                    isSalesperson
                      ? "Você será automaticamente o responsável"
                      : isSDR
                      ? "SDR não pode atribuir vendedor"
                      : "Vendedor responsável por este card"
                  }
                >
                  <Select
                    value={formData.assigned_to_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assigned_to_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    disabled={isSalesperson || isSDR}
                  >
                    <option value="">Sem vendedor</option>
                    {salespeople.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <FormField
                label="Descrição"
                hint="Detalhes sobre a oportunidade, histórico, observações..."
              >
                <Textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Cliente interessado em nosso serviço premium..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>

        </form>
      </BaseModal>

      {/* ── Sub-modal: Criar empresa ── */}
      {showCreateClientModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <ClientModal
            isOpen={showCreateClientModal}
            onClose={() => setShowCreateClientModal(false)}
            onSave={handleClientCreated}
            client={null}
          />
        </div>,
        document.body
      )}

      {/* ── Sub-modal: Editar empresa ── */}
      {showEditClientModal && selectedClient && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <ClientModal
            isOpen={showEditClientModal}
            onClose={() => setShowEditClientModal(false)}
            onSave={handleClientEdited}
            client={selectedClient}
          />
        </div>,
        document.body
      )}

      {/* ── Sub-modal: Criar contato ── */}
      {showCreatePersonModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <PersonModal
            isOpen={showCreatePersonModal}
            onClose={() => setShowCreatePersonModal(false)}
            onSave={handlePersonCreated}
            person={null}
          />
        </div>,
        document.body
      )}

      {/* ── Sub-modal: Editar contato ── */}
      {showEditPersonModal && selectedPerson && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <PersonModal
            isOpen={showEditPersonModal}
            onClose={() => setShowEditPersonModal(false)}
            onSave={handlePersonEdited}
            person={selectedPerson}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default CardModal;
