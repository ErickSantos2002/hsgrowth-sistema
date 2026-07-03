import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Search, X, Building2, User as UserIcon } from "lucide-react";
import { BaseModal, FormField, Input, Textarea, Button, SelectMenu } from "../common";
import RichTextEditor from "../common/RichTextEditor";
import proposalService, {
  ProposalCreate,
  ProposalItem,
  DeliveryAddress,
} from "../../services/proposalService";
import clientService, { Client } from "../../services/clientService";
import personService, { Person } from "../../services/personService";
import productService, { Product } from "../../services/productService";
import { showError, showSuccess } from "../../utils/toast";
import { useAuth } from "../../hooks/useAuth";
import { buildDefaultOtherItems, DEFAULT_NOTES } from "../../utils/proposalDefaults";

// Data local de hoje em YYYY-MM-DD (sem shift de fuso)
const todayISO = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  proposalId?: number | null;
  initial?: ProposalCreate;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const EMPTY_ITEM = (): ProposalItem => ({
  description: "",
  sku: "",
  quantity: 1,
  unit: "Unid",
  unit_price: 0,
});

const EMPTY_FORM = (): ProposalCreate => ({
  client_id: null,
  person_id: null,
  seller_name: "",
  date: "",
  next_contact_date: "",
  intro: "",
  other_items: "",
  discount: 0,
  shipping: 0,
  shipping_method: "",
  freight_type: "",
  carrier_name: "",
  payment_terms: "",
  validity_days: undefined,
  delivery_date: "",
  delivery_desc: "",
  different_delivery_address: false,
  delivery_address: null,
  notes: "",
  signature: "",
  internal_status: "rascunho",
  items: [],
});

// ─── Component ────────────────────────────────────────────────────────────────

const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  proposalId,
  initial,
}) => {
  const isEditing = !!proposalId;
  const { user } = useAuth();

  // ─── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<ProposalCreate>(EMPTY_FORM());
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [proposalNumber, setProposalNumber] = useState<number | null>(null);
  const [editorKey, setEditorKey] = useState(0); // força remount do react-quill ao abrir

  // ─── UI state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // ─── Client picker ───────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // ─── Person picker ───────────────────────────────────────────────────────
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState<Person[]>([]);
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const personSearchRef = useRef<HTMLDivElement>(null);

  // ─── Product search (per row) ─────────────────────────────────────────────
  const productTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [productSearch, setProductSearch] = useState<string[]>([]);
  const [productResults, setProductResults] = useState<Product[][]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean[]>([]);

  // ─── Computed totals ─────────────────────────────────────────────────────
  const totalItems = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const totalProposal = totalItems + (Number(form.shipping) || 0) - (Number(form.discount) || 0);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const setField = useCallback(<K extends keyof ProposalCreate>(key: K, value: ProposalCreate[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Endereço de entrega (JSON) ──────────────────────────────────────────
  const setDelivery = (key: keyof DeliveryAddress, value: string) =>
    setForm((prev) => ({ ...prev, delivery_address: { ...(prev.delivery_address ?? {}), [key]: value } }));

  const lookupCep = async () => {
    const cep = (form.delivery_address?.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) { showError("CEP inválido (informe 8 dígitos)"); return; }
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) { showError("CEP não encontrado"); return; }
      setForm((prev) => ({
        ...prev,
        delivery_address: {
          ...(prev.delivery_address ?? {}),
          city: d.localidade || "",
          state: d.uf || "",
          street: d.logradouro || "",
          district: d.bairro || "",
          complement: d.complemento || (prev.delivery_address?.complement ?? ""),
        },
      }));
    } catch {
      showError("Erro ao buscar o CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const da: DeliveryAddress = form.delivery_address ?? {};

  // Busca cliente/pessoa pelo id e preenche os seletores (nome visível)
  const hydratePickers = (clientId?: number | null, personId?: number | null) => {
    if (clientId) {
      clientService.getById(clientId)
        .then((c) => { setSelectedClient(c); setClientSearch(c.company_name || c.name); })
        .catch(() => {});
    }
    if (personId) {
      personService.getById(personId)
        .then((p) => { setSelectedPerson(p); setPersonSearch(p.name); })
        .catch(() => {});
    }
  };

  // ─── Reset on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // reset seletores/UI
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
    setSelectedPerson(null);
    setPersonSearch("");
    setPersonResults([]);
    setProductSearch([]);
    setProductResults([]);
    setShowProductDropdown([]);
    setIsSearchingProduct([]);
    setSaving(false);

    if (isEditing && proposalId) {
      setProposalNumber(null);
      setLoading(true);
      proposalService
        .get(proposalId)
        .then((p) => {
          setForm({
            client_id: p.client_id ?? null,
            person_id: p.person_id ?? null,
            service_card_id: p.service_card_id ?? null,
            seller_name: p.seller_name ?? "",
            date: p.date ?? "",
            next_contact_date: p.next_contact_date ?? "",
            intro: p.intro ?? "",
            other_items: p.other_items ?? "",
            discount: p.discount ?? 0,
            shipping: p.shipping ?? 0,
            shipping_method: p.shipping_method ?? "",
            freight_type: p.freight_type ?? "",
            carrier_name: p.carrier_name ?? "",
            payment_terms: p.payment_terms ?? "",
            validity_days: p.validity_days ?? undefined,
            delivery_date: p.delivery_date ?? "",
            delivery_desc: p.delivery_desc ?? "",
            different_delivery_address: p.different_delivery_address ?? false,
            delivery_address: p.delivery_address ?? null,
            notes: p.notes ?? "",
            signature: p.signature ?? "",
            internal_status: p.internal_status ?? "rascunho",
            items: [],
          });
          setItems(p.items ?? []);
          setProposalNumber(p.number);
          hydratePickers(p.client_id, p.person_id);
          setEditorKey((k) => k + 1);
        })
        .catch(() => showError("Erro ao carregar proposta"))
        .finally(() => setLoading(false));
    } else {
      // Criação (avulsa ou a partir do card): aplica prefill do card + conteúdo padrão
      const base = initial ?? EMPTY_FORM();
      const defaults = {
        date: base.date || todayISO(),
        signature: base.signature || `Atenciosamente,\n${user?.name || ""}`,
        other_items: base.other_items || buildDefaultOtherItems(),
        notes: base.notes || DEFAULT_NOTES,
      };
      setForm({ ...EMPTY_FORM(), ...base, ...defaults, items: [] });
      setItems(base.items ?? []);
      setProposalNumber(null);
      hydratePickers(base.client_id ?? null, base.person_id ?? null);
      setEditorKey((k) => k + 1);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync items arrays length for product pickers ────────────────────────
  useEffect(() => {
    setProductSearch((prev) => {
      const next = [...prev];
      while (next.length < items.length) next.push("");
      return next.slice(0, items.length);
    });
    setProductResults((prev) => {
      const next = [...prev];
      while (next.length < items.length) next.push([]);
      return next.slice(0, items.length);
    });
    setShowProductDropdown((prev) => {
      const next = [...prev];
      while (next.length < items.length) next.push(false);
      return next.slice(0, items.length);
    });
    setIsSearchingProduct((prev) => {
      const next = [...prev];
      while (next.length < items.length) next.push(false);
      return next.slice(0, items.length);
    });
  }, [items.length]);

  // ─── Close dropdowns on outside click ────────────────────────────────────
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

  // ─── Client search debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (!clientSearch.trim() || !showClientDropdown) { setClientResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const res = await clientService.list({ search: clientSearch.trim(), page_size: 50, is_active: true });
        setClientResults(res.clients);
      } catch { /* silencioso */ } finally { setIsSearchingClients(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [clientSearch, showClientDropdown]);

  // ─── Person search debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (!personSearch.trim() || !showPersonDropdown) { setPersonResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingPersons(true);
      try {
        const res = await personService.list({ search: personSearch.trim(), page_size: 50, is_active: true });
        setPersonResults(res.persons);
      } catch { /* silencioso */ } finally { setIsSearchingPersons(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [personSearch, showPersonDropdown]);

  // ─── Client handlers ──────────────────────────────────────────────────────
  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setClientSearch(c.company_name || c.name);
    setClientResults([]);
    setShowClientDropdown(false);
    setField("client_id", c.id);
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
    setField("client_id", null);
  };

  // ─── Person handlers ──────────────────────────────────────────────────────
  const handleSelectPerson = (p: Person) => {
    setSelectedPerson(p);
    setPersonSearch(p.name);
    setPersonResults([]);
    setShowPersonDropdown(false);
    setField("person_id", p.id);
  };

  const handleRemovePerson = () => {
    setSelectedPerson(null);
    setPersonSearch("");
    setPersonResults([]);
    setField("person_id", null);
  };

  // ─── Item handlers ────────────────────────────────────────────────────────
  const addItem = () => {
    setItems((prev) => [...prev, EMPTY_ITEM()]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = <K extends keyof ProposalItem>(idx: number, key: K, value: ProposalItem[K]) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  // ─── Product search per row ───────────────────────────────────────────────
  const searchProductsForRow = useCallback(async (rowIdx: number, query: string) => {
    if (!query.trim()) {
      setProductResults((prev) => { const n = [...prev]; n[rowIdx] = []; return n; });
      return;
    }
    setIsSearchingProduct((prev) => { const n = [...prev]; n[rowIdx] = true; return n; });
    try {
      const res = await productService.list({ search: query.trim(), page_size: 20, is_active: true });
      setProductResults((prev) => { const n = [...prev]; n[rowIdx] = res.products; return n; });
    } catch { /* silencioso */ } finally {
      setIsSearchingProduct((prev) => { const n = [...prev]; n[rowIdx] = false; return n; });
    }
  }, []);

  const handleProductSearchChange = (rowIdx: number, val: string) => {
    setProductSearch((prev) => { const n = [...prev]; n[rowIdx] = val; return n; });
    setShowProductDropdown((prev) => { const n = [...prev]; n[rowIdx] = true; return n; });
    clearTimeout(productTimers.current[rowIdx]);
    productTimers.current[rowIdx] = setTimeout(() => searchProductsForRow(rowIdx, val), 400);
  };

  const handleSelectProduct = (rowIdx: number, product: Product) => {
    updateItem(rowIdx, "product_id", product.id);
    updateItem(rowIdx, "description", product.name);
    updateItem(rowIdx, "sku", product.sku ?? "");
    updateItem(rowIdx, "unit_price", product.unit_price);
    setProductSearch((prev) => { const n = [...prev]; n[rowIdx] = product.name; return n; });
    setShowProductDropdown((prev) => { const n = [...prev]; n[rowIdx] = false; return n; });
    setProductResults((prev) => { const n = [...prev]; n[rowIdx] = []; return n; });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cleanDate = (d?: string | null) => (d && String(d).trim() ? d : null);
      const payload: ProposalCreate = {
        ...form,
        date: cleanDate(form.date),
        next_contact_date: cleanDate(form.next_contact_date),
        delivery_date: cleanDate(form.delivery_date),
        discount: Number(form.discount) || 0,
        shipping: Number(form.shipping) || 0,
        validity_days: form.validity_days ? Number(form.validity_days) : undefined,
        // só envia o endereço de entrega quando o checkbox está marcado
        delivery_address: form.different_delivery_address ? (form.delivery_address ?? null) : null,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
        })),
      };

      if (isEditing && proposalId) {
        await proposalService.update(proposalId, payload);
        showSuccess("Proposta atualizada com sucesso!");
      } else {
        await proposalService.create(payload);
        showSuccess("Proposta criada com sucesso!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } }; message?: string };
      const detail = axiosErr?.response?.data?.detail;
      let msg = "Erro ao salvar a proposta";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        // 422 do FastAPI: lista de { loc, msg, ... } — nunca renderizar o objeto cru
        msg =
          detail
            .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : ""))
            .filter(Boolean)
            .join("; ") || msg;
      } else if (axiosErr?.message) {
        msg = axiosErr.message;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Section heading helper ───────────────────────────────────────────────
  const SectionHeading = ({ label }: { label: string }) => (
    <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {label}
    </h3>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Proposta${proposalNumber ? ` #${proposalNumber}` : ""}` : "Nova Proposta"}
      subtitle={isEditing ? "Edite os dados da proposta comercial" : "Preencha os dados para criar uma nova proposta comercial"}
      size="2xl"
      closeOnOverlayClick={false}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving || loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={loading}>
            {isEditing ? "Salvar Alterações" : "Criar Proposta"}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── 1. Cliente ── */}
          <section>
            <SectionHeading label="Cliente" />
            <div className="space-y-4">

              {/* Cliente picker */}
              <FormField label="Empresa / Cliente">
                {selectedClient ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {selectedClient.company_name || selectedClient.name}
                      </p>
                      {selectedClient.document && (
                        <p className="mt-0.5 text-xs text-slate-400">CNPJ/CPF: {selectedClient.document}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveClient}
                      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-red-400"
                      title="Remover empresa"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1" ref={clientSearchRef}>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Buscar empresa por nome ou CNPJ..."
                        disabled={saving}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                      {clientSearch && (
                        <button type="button" onClick={() => { setClientSearch(""); setClientResults([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400">
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
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{c.company_name || c.name}</p>
                                {c.document && <p className="text-xs text-slate-400">{c.document}</p>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </FormField>

              {/* CNPJ read-only (from selected client) */}
              {selectedClient?.document && (
                <FormField label="CNPJ / Documento">
                  <input
                    readOnly
                    value={selectedClient.document}
                    className="w-full cursor-default rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                  />
                </FormField>
              )}

              {/* Contato (person picker) */}
              <FormField label="Aos cuidados de">
                {selectedPerson ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {selectedPerson.email || selectedPerson.email_commercial || selectedPerson.email_personal || selectedPerson.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {selectedPerson.name}{selectedPerson.position ? ` · ${selectedPerson.position}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={handleRemovePerson}
                      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-red-400" title="Remover contato">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1" ref={personSearchRef}>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={personSearch}
                        onChange={(e) => { setPersonSearch(e.target.value); setShowPersonDropdown(true); }}
                        onFocus={() => setShowPersonDropdown(true)}
                        placeholder="Buscar contato por nome ou e-mail..."
                        disabled={saving}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                      {personSearch && (
                        <button type="button" onClick={() => { setPersonSearch(""); setPersonResults([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400">
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
                  </div>
                )}
              </FormField>

              {/* Endereço de entrega diferente (usado na impressão/visualização — fase 2) */}
              <label className="flex cursor-pointer items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={!!form.different_delivery_address}
                  onChange={(e) => setField("different_delivery_address", e.target.checked)}
                  disabled={saving}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  O endereço de entrega do cliente é diferente do endereço de cobrança
                </span>
              </label>
              {form.different_delivery_address && (
                <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Endereço de entrega
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <FormField label="CEP" className="sm:col-span-2">
                      <div className="relative">
                        <Input type="text" value={da.cep ?? ""} onChange={(e) => setDelivery("cep", e.target.value)} placeholder="00000-000" disabled={saving} />
                        <button
                          type="button"
                          onClick={lookupCep}
                          disabled={saving || cepLoading}
                          title="Buscar endereço pelo CEP"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-emerald-500 disabled:opacity-50"
                        >
                          <Search size={16} />
                        </button>
                      </div>
                    </FormField>
                    <FormField label="Cidade" className="sm:col-span-3">
                      <Input type="text" value={da.city ?? ""} onChange={(e) => setDelivery("city", e.target.value)} disabled={saving} />
                    </FormField>
                    <FormField label="UF" className="sm:col-span-1">
                      <SelectMenu
                        value={da.state ?? ""}
                        onChange={(v) => setDelivery("state", v)}
                        options={[{ value: "", label: "—" }, ...UF_OPTIONS.map((uf) => ({ value: uf, label: uf }))]}
                      />
                    </FormField>
                  </div>
                  <FormField label="Endereço">
                    <Input type="text" value={da.street ?? ""} onChange={(e) => setDelivery("street", e.target.value)} placeholder="Logradouro" disabled={saving} />
                  </FormField>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <FormField label="Bairro"><Input type="text" value={da.district ?? ""} onChange={(e) => setDelivery("district", e.target.value)} disabled={saving} /></FormField>
                    <FormField label="Número"><Input type="text" value={da.number ?? ""} onChange={(e) => setDelivery("number", e.target.value)} disabled={saving} /></FormField>
                    <FormField label="Complemento"><Input type="text" value={da.complement ?? ""} onChange={(e) => setDelivery("complement", e.target.value)} disabled={saving} /></FormField>
                    <FormField label="Insc. estadual"><Input type="text" value={da.state_registration ?? ""} onChange={(e) => setDelivery("state_registration", e.target.value)} disabled={saving} /></FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <FormField label="Destinatário"><Input type="text" value={da.recipient ?? ""} onChange={(e) => setDelivery("recipient", e.target.value)} disabled={saving} /></FormField>
                    <FormField label="Tipo de Pessoa">
                      <SelectMenu
                        value={da.person_type ?? "fisica"}
                        onChange={(v) => setDelivery("person_type", v)}
                        options={[{ value: "fisica", label: "Física" }, { value: "juridica", label: "Jurídica" }]}
                      />
                    </FormField>
                    <FormField label="CPF / CNPJ"><Input type="text" value={da.document ?? ""} onChange={(e) => setDelivery("document", e.target.value)} disabled={saving} /></FormField>
                    <FormField label="Fone"><Input type="text" value={da.phone ?? ""} onChange={(e) => setDelivery("phone", e.target.value)} disabled={saving} /></FormField>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* ── 2. Introdução ── */}
          <section>
            <SectionHeading label="Introdução" />
            <FormField label="Texto de introdução">
              <Textarea
                value={form.intro ?? ""}
                onChange={(e) => setField("intro", e.target.value)}
                placeholder="Ex: É com satisfação que apresentamos nossa proposta comercial..."
                rows={4}
                disabled={saving}
              />
            </FormField>
          </section>

          {/* ── 3. Identificação da proposta ── */}
          <section>
            <SectionHeading label="Identificação da Proposta" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField label="Nº Proposta">
                <input
                  readOnly
                  value={isEditing && proposalNumber != null ? String(proposalNumber) : "(automático)"}
                  className="w-full cursor-default rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                />
              </FormField>

              <FormField label="Vendedor">
                <Input
                  type="text"
                  value={form.seller_name ?? ""}
                  onChange={(e) => setField("seller_name", e.target.value)}
                  placeholder="Nome do vendedor responsável"
                  disabled={saving}
                />
              </FormField>

              <FormField label="Data da Proposta">
                <Input
                  type="date"
                  value={form.date ?? ""}
                  onChange={(e) => setField("date", e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Data do Próximo Contato">
                <Input
                  type="date"
                  value={form.next_contact_date ?? ""}
                  onChange={(e) => setField("next_contact_date", e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Status interno">
                <SelectMenu
                  value={form.internal_status ?? "rascunho"}
                  onChange={(v) => setField("internal_status", v)}
                  options={[
                    { value: "rascunho", label: "Rascunho" },
                    { value: "enviada", label: "Enviada" },
                  ]}
                  disabled={saving}
                />
              </FormField>

            </div>
          </section>

          {/* ── 4. Itens de produto ou serviço ── */}
          <section>
            <SectionHeading label="Itens de Produto ou Serviço" />

            {items.length === 0 ? (
              <p className="mb-3 text-sm text-slate-400">Nenhum item adicionado.</p>
            ) : (
              <div className="mb-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-slate-700 dark:bg-slate-800/60">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Item / Descrição</th>
                      <th className="w-28 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Código/SKU</th>
                      <th className="w-20 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Qtde</th>
                      <th className="w-20 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">UN</th>
                      <th className="w-32 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Preço un.</th>
                      <th className="w-32 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Preço total</th>
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {items.map((item, idx) => {
                      const rowTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                      return (
                        <tr key={idx} className="bg-white dark:bg-slate-900">
                          {/* Description with product search */}
                          <td className="px-3 py-2">
                            <div className="relative">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                                  placeholder="Descrição do item..."
                                  disabled={saving}
                                  className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                />
                                <button
                                  type="button"
                                  title="Buscar produto"
                                  onClick={() => {
                                    setShowProductDropdown((prev) => { const n = [...prev]; n[idx] = !n[idx]; return n; });
                                  }}
                                  className="shrink-0 rounded p-1 text-slate-400 hover:text-emerald-500"
                                >
                                  <Search size={14} />
                                </button>
                              </div>
                              {showProductDropdown[idx] && (
                                <div className="absolute left-0 top-full z-40 mt-1 w-full min-w-[260px] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                  <div className="p-2">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={productSearch[idx] ?? ""}
                                      onChange={(e) => handleProductSearchChange(idx, e.target.value)}
                                      placeholder="Buscar produto..."
                                      className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    />
                                  </div>
                                  <div className="max-h-40 overflow-y-auto">
                                    {isSearchingProduct[idx] ? (
                                      <p className="px-3 py-2 text-xs text-slate-400">Buscando...</p>
                                    ) : productResults[idx]?.length === 0 ? (
                                      <p className="px-3 py-2 text-xs text-slate-400">Nenhum produto encontrado</p>
                                    ) : (
                                      (productResults[idx] ?? []).map((prod) => (
                                        <button
                                          key={prod.id}
                                          type="button"
                                          onClick={() => handleSelectProduct(idx, prod)}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                                        >
                                          <p className="font-medium text-slate-900 dark:text-white">{prod.name}</p>
                                          <p className="text-xs text-slate-400">
                                            {prod.sku && <span className="mr-2">SKU: {prod.sku}</span>}
                                            R$ {formatCurrency(prod.unit_price)}
                                          </p>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                  <div className="border-t border-gray-100 p-2 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => setShowProductDropdown((prev) => { const n = [...prev]; n[idx] = false; return n; })}
                                      className="w-full rounded py-1 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                      Fechar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.sku ?? ""}
                              onChange={(e) => updateItem(idx, "sku", e.target.value)}
                              placeholder="SKU"
                              disabled={saving}
                              className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                              disabled={saving}
                              className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* Unit */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.unit ?? "Unid"}
                              onChange={(e) => updateItem(idx, "unit", e.target.value)}
                              disabled={saving}
                              className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* Unit price */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                              disabled={saving}
                              className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* Row total (read-only) */}
                          <td className="px-3 py-2">
                            <span className="block rounded bg-gray-50 px-2 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                              R$ {formatCurrency(rowTotal)}
                            </span>
                          </td>

                          {/* Remove */}
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={saving}
                              className="rounded p-1 text-slate-400 transition-colors hover:text-red-500"
                              title="Remover item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus size={15} />}
              onClick={addItem}
              disabled={saving}
            >
              Adicionar item
            </Button>
          </section>

          {/* ── 5. Outros itens ou serviços ── */}
          <section>
            <SectionHeading label="Outros Itens ou Serviços" />
            <RichTextEditor
              key={editorKey}
              value={form.other_items ?? ""}
              onChange={(v) => setField("other_items", v)}
              placeholder="Descreva outros itens, serviços ou condições especiais..."
            />
          </section>

          {/* ── 6. Totais ── */}
          <section>
            <SectionHeading label="Totais" />
            <div className="space-y-3">

              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-800/50">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total dos itens</span>
                <span className="font-medium text-slate-900 dark:text-white">R$ {formatCurrency(totalItems)}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Desconto (R$)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discount ?? 0}
                    onChange={(e) => setField("discount", Number(e.target.value))}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Frete (R$)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shipping ?? 0}
                    onChange={(e) => setField("shipping", Number(e.target.value))}
                    disabled={saving}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="font-semibold text-slate-800 dark:text-white">Total da Proposta</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  R$ {formatCurrency(totalProposal)}
                </span>
              </div>

            </div>
          </section>

          {/* ── 7. Transportador ── */}
          <section>
            <SectionHeading label="Transportador" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <FormField label="Forma de envio">
                <Input
                  type="text"
                  value={form.shipping_method ?? ""}
                  onChange={(e) => setField("shipping_method", e.target.value)}
                  placeholder="Ex: Sedex, PAC, Transportadora..."
                  disabled={saving}
                />
              </FormField>

              <FormField label="Forma de frete">
                <Input
                  type="text"
                  value={form.freight_type ?? ""}
                  onChange={(e) => setField("freight_type", e.target.value)}
                  placeholder="Ex: CIF, FOB..."
                  disabled={saving}
                />
              </FormField>

              <FormField label="Nome do transportador">
                <Input
                  type="text"
                  value={form.carrier_name ?? ""}
                  onChange={(e) => setField("carrier_name", e.target.value)}
                  placeholder="Nome da transportadora"
                  disabled={saving}
                />
              </FormField>

            </div>
          </section>

          {/* ── 8. Condições comerciais ── */}
          <section>
            <SectionHeading label="Condições Comerciais" />
            <FormField label="Condição de pagamento / Parcelas">
              <Input
                type="text"
                value={form.payment_terms ?? ""}
                onChange={(e) => setField("payment_terms", e.target.value)}
                placeholder="Ex: 30/60/90 dias, à vista, boleto..."
                disabled={saving}
              />
            </FormField>
          </section>

          {/* ── 9. Condições gerais ── */}
          <section>
            <SectionHeading label="Condições Gerais" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <FormField label="Validade (dias)">
                <Input
                  type="number"
                  min={0}
                  value={form.validity_days ?? ""}
                  onChange={(e) => setField("validity_days", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 30"
                  disabled={saving}
                />
              </FormField>

              <FormField label="Data prevista de entrega">
                <Input
                  type="date"
                  value={form.delivery_date ?? ""}
                  onChange={(e) => setField("delivery_date", e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Descrição do prazo">
                <Input
                  type="text"
                  value={form.delivery_desc ?? ""}
                  onChange={(e) => setField("delivery_desc", e.target.value)}
                  placeholder="Ex: 15 dias úteis após aprovação"
                  disabled={saving}
                />
              </FormField>

            </div>
          </section>

          {/* ── 10. Observações e assinatura ── */}
          <section>
            <SectionHeading label="Observações e Assinatura" />
            <div className="space-y-4">

              <FormField label="Observações">
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Observações adicionais sobre a proposta..."
                  rows={3}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Assinatura / Responsável">
                <Textarea
                  value={form.signature ?? ""}
                  onChange={(e) => setField("signature", e.target.value)}
                  placeholder="Atenciosamente,&#10;Nome do responsável"
                  rows={2}
                  disabled={saving}
                />
              </FormField>

            </div>
          </section>

        </div>
      )}
    </BaseModal>
  );
};

export default ProposalModal;
