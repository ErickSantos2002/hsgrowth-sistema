import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  User as UserIcon,
  Search,
  X,
  Plus,
  Calendar,
  Radio,
} from "lucide-react";
import { BaseModal, FormField, Input, Textarea, Button } from "../common";
import clientService, { Client } from "../../services/clientService";
import personService, { Person } from "../../services/personService";
import ClientModal from "../clients/ClientModal";
import PersonModal from "../persons/PersonModal";
import { ServiceCard, ServiceList } from "../../services/serviceBoardService";

export interface ServiceCardFormData {
  list_id: number;
  title: string;
  description?: string;
  due_date?: string;
  client_id?: number | null;
  person_id?: number | null;
}

interface ServiceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ServiceCardFormData) => Promise<void>;
  card?: ServiceCard | null;
  lists: ServiceList[];
  defaultListId: number;
}

const ServiceCardModal: React.FC<ServiceCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card,
  lists,
  defaultListId,
}) => {
  const isCreating = !card;

  // ─── Campos básicos ───────────────────────────────────────────────────────
  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [listId, setListId] = useState(card?.list_id || defaultListId);
  const [dueDate, setDueDate] = useState(() => {
    if (card?.due_date) return new Date(card.due_date).toISOString().split("T")[0];
    return "";
  });
  const [titleError, setTitleError] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Empresa ──────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // ─── Contato ──────────────────────────────────────────────────────────────
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState<Person[]>([]);
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showCreatePersonModal, setShowCreatePersonModal] = useState(false);
  const personSearchRef = useRef<HTMLDivElement>(null);

  // ─── Reset ao abrir ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setTitle(card?.title || "");
    setDescription(card?.description || "");
    setListId(card?.list_id || defaultListId);
    setDueDate(card?.due_date ? new Date(card.due_date).toISOString().split("T")[0] : "");
    setTitleError("");
    setSaving(false);
    // Para edição: o card já tem client_name/person_name mas não o objeto completo;
    // campos de busca ficam vazios para re-seleção se necessário.
    setSelectedClient(null);
    setClientSearch(card?.client_name || "");
    setSelectedPerson(null);
    setPersonSearch(card?.person_name || "");
    setClientResults([]);
    setPersonResults([]);
    setShowClientDropdown(false);
    setShowPersonDropdown(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node))
        setShowClientDropdown(false);
      if (personSearchRef.current && !personSearchRef.current.contains(e.target as Node))
        setShowPersonDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Busca de empresas com debounce ───────────────────────────────────────
  useEffect(() => {
    if (!clientSearch.trim() || !showClientDropdown) {
      setClientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const res = await clientService.list({ search: clientSearch.trim(), page_size: 50, is_active: true });
        setClientResults(res.clients);
      } catch { /* silencioso */ } finally {
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
      setIsSearchingPersons(true);
      try {
        const res = await personService.list({ search: personSearch.trim(), page_size: 50, is_active: true });
        setPersonResults(res.persons);
      } catch { /* silencioso */ } finally {
        setIsSearchingPersons(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [personSearch, showPersonDropdown]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setClientSearch(c.company_name || c.name);
    setClientResults([]);
    setShowClientDropdown(false);
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
  };

  const handleSelectPerson = (p: Person) => {
    setSelectedPerson(p);
    setPersonSearch(p.name);
    setPersonResults([]);
    setShowPersonDropdown(false);
  };

  const handleRemovePerson = () => {
    setSelectedPerson(null);
    setPersonSearch("");
    setPersonResults([]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setTitleError("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        list_id: listId,
        title: title.trim(),
        description: description || undefined,
        due_date: dueDate || undefined,
        client_id: selectedClient?.id ?? (card?.client_id || null),
        person_id: selectedPerson?.id ?? (card?.person_id || null),
      });
    } finally {
      setSaving(false);
    }
  };

  const getPersonContact = (p: Person) =>
    p.email || p.email_commercial || p.phone_whatsapp || p.phone || null;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={isCreating ? "Novo Card" : "Editar Card"}
        subtitle={
          isCreating
            ? "Preencha as informações para criar o card de serviço"
            : "Edite as informações do card"
        }
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!title.trim()}>
              {isCreating ? "Criar Card" : "Salvar Alterações"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Informações básicas ── */}
          <div className="space-y-4">
            <FormField label="Lista" hint="Selecione em qual lista o card será criado">
              <select
                value={listId}
                onChange={(e) => setListId(Number(e.target.value))}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Título do Card" required error={titleError}>
              <Input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (e.target.value) setTitleError(""); }}
                placeholder="Ex: Calibração equipamento X, Manutenção preventiva..."
                error={!!titleError}
                disabled={saving}
                autoFocus
              />
            </FormField>
          </div>

          {/* ── Empresa (Organização) ── */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Building2 size={14} />
              Empresa (Organização)
            </h3>

            {selectedClient ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">
                    {selectedClient.company_name || selectedClient.name}
                  </p>
                  {selectedClient.document && (
                    <p className="mt-0.5 text-xs text-slate-400">{selectedClient.document}</p>
                  )}
                  {selectedClient.sector && (
                    <span className="mt-1 inline-block rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
                      {selectedClient.sector}
                    </span>
                  )}
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
            ) : (
              <div className="space-y-2" ref={clientSearchRef}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Buscar empresa por nome ou CNPJ..."
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  {clientSearch && (
                    <button type="button" onClick={() => { setClientSearch(""); setClientResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                  {showClientDropdown && clientSearch.trim() && (
                    <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                      {isSearchingClients ? (
                        <p className="p-3 text-center text-xs text-slate-400">Buscando empresas...</p>
                      ) : clientResults.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-400">Nenhuma empresa encontrada</p>
                      ) : (
                        clientResults.map((c) => (
                          <button key={c.id} type="button" onClick={() => handleSelectClient(c)}
                            className="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {c.company_name || c.name}
                            </p>
                            {c.document && <p className="text-xs text-slate-400">{c.document}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => setShowCreateClientModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-2 text-sm text-slate-400 transition-colors hover:border-violet-500/50 hover:text-violet-400">
                  <Plus size={14} />
                  Cadastrar nova empresa
                </button>
              </div>
            )}
          </div>

          {/* ── Contato (Pessoa) ── */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <UserIcon size={14} />
              Contato (Pessoa)
            </h3>

            {selectedPerson ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{selectedPerson.name}</p>
                  {selectedPerson.position && (
                    <p className="mt-0.5 text-xs text-slate-400">{selectedPerson.position}</p>
                  )}
                  {getPersonContact(selectedPerson) && (
                    <p className="mt-1 text-xs text-blue-400">{getPersonContact(selectedPerson)}</p>
                  )}
                </div>
                <button type="button" onClick={handleRemovePerson}
                  className="shrink-0 rounded p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remover contato">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2" ref={personSearchRef}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={personSearch}
                    onChange={(e) => { setPersonSearch(e.target.value); setShowPersonDropdown(true); }}
                    onFocus={() => setShowPersonDropdown(true)}
                    placeholder="Buscar contato por nome, e-mail ou telefone..."
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  {personSearch && (
                    <button type="button" onClick={() => { setPersonSearch(""); setPersonResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                  {showPersonDropdown && personSearch.trim() && (
                    <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                      {isSearchingPersons ? (
                        <p className="p-3 text-center text-xs text-slate-400">Buscando contatos...</p>
                      ) : personResults.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-400">Nenhum contato encontrado</p>
                      ) : (
                        personResults.map((p) => (
                          <button key={p.id} type="button" onClick={() => handleSelectPerson(p)}
                            className="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                            {p.position && <p className="text-xs text-slate-400">{p.position}</p>}
                            {(p.email || p.email_commercial) && (
                              <p className="text-xs text-blue-400">{p.email || p.email_commercial}</p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => setShowCreatePersonModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-2 text-sm text-slate-400 transition-colors hover:border-violet-500/50 hover:text-violet-400">
                  <Plus size={14} />
                  Cadastrar novo contato
                </button>
              </div>
            )}
          </div>

          {/* ── Detalhes ── */}
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
              >
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Descrição">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre o serviço..."
                  rows={3}
                  disabled={saving}
                />
              </FormField>
            </div>
          </div>

        </form>
      </BaseModal>

      {/* Modal de criar nova empresa */}
      {showCreateClientModal && (
        <ClientModal
          isOpen={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          onSave={(client) => {
            if (client) handleSelectClient(client);
            setShowCreateClientModal(false);
          }}
        />
      )}

      {/* Modal de criar novo contato */}
      {showCreatePersonModal && (
        <PersonModal
          isOpen={showCreatePersonModal}
          onClose={() => setShowCreatePersonModal(false)}
          onSave={(person) => {
            if (person) handleSelectPerson(person);
            setShowCreatePersonModal(false);
          }}
        />
      )}
    </>
  );
};

export default ServiceCardModal;
