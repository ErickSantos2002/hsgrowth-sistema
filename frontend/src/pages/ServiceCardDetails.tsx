import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Info,
  Clock,
  FileText,
  Trash2,
  ExternalLink,
  Search,
  X,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Linkedin,
  Check,
  Pencil,
  Activity,
  StickyNote,
  CalendarDays,
  Paperclip,
  PhoneCall,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import serviceBoardService, {
  ServiceCard,
  ServiceList,
} from "../services/serviceBoardService";
import serviceActivityService, { ServiceCardActivity } from "../services/serviceActivityService";
import api4comService from "../services/api4comService";
import { ServiceActivityTab, ServiceNotesTab, ServiceFilesTab } from "../components/service/ServiceActivityTab";
import clientService, { Client } from "../services/clientService";
import personService, { Person } from "../services/personService";
import ExpandableSection from "../components/cardDetails/ExpandableSection";
import ActionButton from "../components/cardDetails/ActionButton";
import ServiceProductSection from "../components/service/ServiceProductSection";
import ClientModal from "../components/clients/ClientModal";
import PersonModal from "../components/persons/PersonModal";
import { showSuccess, showError } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import { LoadingSpinner } from "../components/common";

/**
 * Página de detalhes do Card de Serviços — Layout estilo Pipedrive (tema escuro)
 * Layout: 30% (informações) + 70% (atividades/histórico)
 * Espelha o padrão da página de detalhes de Vendas (CardDetails.tsx)
 */

type TabKey =
  | "atividade"
  | "anotacoes"
  | "calendario"
  | "arquivos"
  | "ligacoes"
  | "reunioes"
  | "email";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "atividade", label: "Atividade", icon: <Activity size={16} /> },
  { key: "anotacoes", label: "Anotações", icon: <StickyNote size={16} /> },
  { key: "calendario", label: "Calendário", icon: <CalendarDays size={16} /> },
  { key: "arquivos", label: "Arquivos", icon: <Paperclip size={16} /> },
  { key: "ligacoes", label: "Ligações", icon: <PhoneCall size={16} /> },
  { key: "reunioes", label: "Reuniões", icon: <UsersIcon size={16} /> },
  { key: "email", label: "E-mail", icon: <Mail size={16} /> },
];

// ─── Seção: Resumo ──────────────────────────────────────────────────────────────

const ServiceSummarySection: React.FC<{
  card: ServiceCard;
  onUpdate: (data: { due_date?: string | null; description?: string }) => Promise<void>;
}> = ({ card, onUpdate }) => {
  const [editingDue, setEditingDue] = useState(false);
  const [dueValue, setDueValue] = useState(card.due_date ? card.due_date.split("T")[0] : "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(card.description || "");

  useEffect(() => {
    setDueValue(card.due_date ? card.due_date.split("T")[0] : "");
    setDescValue(card.description || "");
  }, [card.due_date, card.description]);

  const formatDate = (date?: string | null) => {
    if (!date) return "Não definida";
    const datePart = date.substring(0, 10);
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("pt-BR");
  };

  const handleSaveDue = async () => {
    await onUpdate({ due_date: dueValue ? `${dueValue}T00:00:00` : null });
    setEditingDue(false);
  };

  const handleSaveDesc = async () => {
    await onUpdate({ description: descValue });
    setEditingDesc(false);
  };

  return (
    <ExpandableSection title="Resumo" defaultExpanded={false} icon={<Info size={18} />}>
      <div className="space-y-5">
        {/* Data de Vencimento */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Calendar size={14} className="text-slate-400" />
              <span>Data de vencimento</span>
            </div>
            {!editingDue && (
              <button
                onClick={() => setEditingDue(true)}
                className="text-slate-400 transition-colors hover:text-blue-400"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          {editingDue ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueValue}
                onChange={(e) => setDueValue(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveDue} className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30">
                <Check size={16} />
              </button>
              <button onClick={() => { setEditingDue(false); setDueValue(card.due_date ? card.due_date.split("T")[0] : ""); }} className="rounded-lg bg-gray-200/50 dark:bg-slate-700/50 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2">
              <span className={`text-sm ${card.due_date ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {formatDate(card.due_date)}
              </span>
            </div>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <FileText size={14} className="text-slate-400" />
              <span>Descrição</span>
            </div>
            {!editingDesc && (
              <button
                onClick={() => setEditingDesc(true)}
                className="text-slate-400 transition-colors hover:text-blue-400"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          {editingDesc ? (
            <div className="space-y-2">
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                rows={4}
                placeholder="Clique para adicionar uma descrição..."
                className="w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSaveDesc} className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/30">
                  <Check size={14} /> Salvar
                </button>
                <button onClick={() => { setEditingDesc(false); setDescValue(card.description || ""); }} className="flex items-center gap-1 rounded-lg bg-gray-200/50 dark:bg-slate-700/50 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X size={14} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 min-h-[60px]">
              <span className={`whitespace-pre-wrap text-sm ${card.description ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}`}>
                {card.description || "Nenhuma descrição"}
              </span>
            </div>
          )}
        </div>

        {/* Informações gerais */}
        <div className="space-y-3 border-t border-gray-200/50 dark:border-slate-700/50 pt-4">
          <h4 className="text-sm font-semibold text-slate-400">Informações Gerais</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Criado em:</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{formatDateTime(card.created_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Atualizado em:</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{formatDateTime(card.updated_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">ID:</span>
            <span className="font-mono text-sm font-medium text-slate-600 dark:text-slate-300">#{card.id}</span>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

// ─── Seção: Empresa (Cliente) ───────────────────────────────────────────────────

const ServiceClientSection: React.FC<{
  card: ServiceCard;
  onLink: (clientId: number | null) => Promise<void>;
}> = ({ card, onLink }) => {
  const { confirm } = useConfirm();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!card.client_id) { setClient(null); return; }
      try {
        setLoading(true);
        setClient(await clientService.getById(card.client_id));
      } catch { /* ignora */ } finally { setLoading(false); }
    };
    load();
  }, [card.client_id]);

  useEffect(() => {
    if (!searchTerm.trim() || !showModal) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const r = await clientService.list({ page_size: 100, is_active: true, search: searchTerm.trim() });
        setResults(r.clients.filter((c) => {
          if (!c.document) return true;
          const d = c.document.replace(/\D/g, "");
          return d.length === 11 || d.length === 14 || d.length === 0;
        }));
      } catch { /* ignora */ } finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, showModal]);

  const formatDocument = (doc?: string) => {
    if (!doc) return "";
    const c = doc.replace(/\D/g, "");
    if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return doc;
  };

  const handleLink = async (id: number) => {
    await onLink(id);
    setShowModal(false);
    setSearchTerm("");
  };

  const handleUnlink = async () => {
    const ok = await confirm({ title: "Desvincular cliente", message: "Deseja desvincular este cliente do card?", confirmText: "Desvincular", isDanger: false });
    if (!ok) return;
    await onLink(null);
  };

  const handleCreated = async () => {
    setShowCreateModal(false);
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await clientService.list({ page_size: 1, is_active: true });
      if (r.clients.length > 0) await onLink(r.clients[0].id);
    } catch {
      showError("Cliente criado, mas houve erro ao vincular. Vincule manualmente.");
    }
  };

  const searchModal = showModal && ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
      <div className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Vincular Cliente</h3>
          <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
        </div>
        <div className="border-b border-gray-200 dark:border-slate-700 p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, CPF ou CNPJ..." autoFocus
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {searching ? <div className="p-8 text-center text-sm text-slate-400">Buscando clientes...</div>
            : !searchTerm.trim() ? <div className="p-8 text-center text-sm text-slate-400">Digite o nome, CPF ou CNPJ para buscar</div>
            : results.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Nenhum cliente encontrado</div>
            : <div className="space-y-2">{results.map((c) => (
                <button key={c.id} onClick={() => handleLink(c.id)} className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50">
                  <p className="font-medium text-slate-900 dark:text-white">{c.company_name || c.name}</p>
                  {c.document && <p className="mt-1 text-xs text-slate-400">{formatDocument(c.document)}</p>}
                </button>
              ))}</div>}
        </div>
      </div>
    </div>,
    document.body
  );

  if (!card.client_id && !loading) {
    return (
      <>
        <ExpandableSection title="Empresa (Cliente)" defaultExpanded={false} icon={<Building2 size={18} />}>
          <div className="space-y-3">
            <p className="py-2 text-center text-sm text-slate-400">Nenhum cliente vinculado a este card</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setShowModal(true); setSearchTerm(""); }} className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-3 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30">
                <ExternalLink size={16} /> Vincular
              </button>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-3 font-medium text-slate-900 dark:text-green-400 transition-colors hover:bg-green-500/30">
                <Plus size={16} /> Cadastrar
              </button>
            </div>
          </div>
        </ExpandableSection>
        {searchModal}
        {showCreateModal && <ClientModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreated} client={null} />}
      </>
    );
  }

  return (
    <>
      <ExpandableSection title="Empresa (Cliente)" defaultExpanded={false} icon={<Building2 size={18} />}>
        {loading ? <div className="py-4 text-center text-sm text-slate-400">Carregando...</div> : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"><Building2 size={14} className="text-slate-400" /><span>Nome da empresa</span></div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2"><p className="text-slate-900 dark:text-white">{client?.company_name || client?.name || "Não informado"}</p></div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{client?.document && client.document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"}</div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2"><p className={client?.document ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}>{client?.document ? formatDocument(client.document) : "Não informado"}</p></div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Contato</div>
              <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
                <div><p className="text-xs text-slate-400">Telefone</p><p className={client?.phone ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>{client?.phone || "Não informado"}</p></div>
                <div><p className="text-xs text-slate-400">Email</p><p className={client?.email ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>{client?.email || "Não informado"}</p></div>
              </div>
            </div>
            <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
              <ActionButton icon={<ExternalLink size={16} />} label="Modificar cadastro do cliente" onClick={() => setShowEditModal(true)} variant="warning" className="w-full" />
              <ActionButton icon={<Trash2 size={16} />} label="Desvincular cliente" onClick={handleUnlink} variant="danger" className="w-full" />
            </div>
          </div>
        )}
      </ExpandableSection>
      {showEditModal && client && <ClientModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={async () => { setShowEditModal(false); if (card.client_id) setClient(await clientService.getById(card.client_id)); }} client={client} />}
    </>
  );
};

// ─── Seção: Contato (Pessoa) ────────────────────────────────────────────────────

const ServiceContactSection: React.FC<{
  card: ServiceCard;
  onLink: (personId: number | null) => Promise<void>;
}> = ({ card, onLink }) => {
  const { confirm } = useConfirm();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!card.person_id) { setPerson(null); return; }
      try {
        setLoading(true);
        setPerson(await personService.getById(card.person_id));
      } catch { /* ignora */ } finally { setLoading(false); }
    };
    load();
  }, [card.person_id]);

  useEffect(() => {
    if (!searchTerm.trim() || !showModal) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const r = await personService.list({ page_size: 100, is_active: true, search: searchTerm.trim() });
        setResults(r.persons);
      } catch { /* ignora */ } finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, showModal]);

  const formatPhone = (phone?: string | null) => {
    if (!phone) return "Não informado";
    const c = phone.replace(/\D/g, "");
    if (c.length === 11) return c.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (c.length === 10) return c.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return phone;
  };

  const handleLink = async (id: number) => {
    await onLink(id);
    setShowModal(false);
    setSearchTerm("");
  };

  const handleUnlink = async () => {
    const ok = await confirm({ title: "Desvincular pessoa", message: "Deseja desvincular esta pessoa do card?", confirmText: "Desvincular", isDanger: false });
    if (!ok) return;
    await onLink(null);
  };

  const handleCreated = async (created?: Person) => {
    setShowCreateModal(false);
    if (!created) { showError("Pessoa criada, mas não foi possível vinculá-la automaticamente."); return; }
    await onLink(created.id);
  };

  const searchModal = showModal && ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
      <div className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Vincular Pessoa</h3>
          <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
        </div>
        <div className="border-b border-gray-200 dark:border-slate-700 p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, email, telefone ou cargo..." autoFocus
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {searching ? <div className="p-8 text-center text-sm text-slate-400">Buscando pessoas...</div>
            : !searchTerm.trim() ? <div className="p-8 text-center text-sm text-slate-400">Digite para buscar</div>
            : results.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Nenhuma pessoa encontrada</div>
            : <div className="space-y-2">{results.map((p) => (
                <button key={p.id} onClick={() => handleLink(p.id)} className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50">
                  <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                  {p.position && <p className="mt-1 text-xs text-slate-400">{p.position}</p>}
                  {(p.email_commercial || p.email) && <p className="mt-1 text-xs text-blue-400">{p.email_commercial || p.email}</p>}
                </button>
              ))}</div>}
        </div>
      </div>
    </div>,
    document.body
  );

  if (!card.person_id && !loading) {
    return (
      <>
        <ExpandableSection title="Informação de Contato (Pessoa)" defaultExpanded={false} icon={<User size={18} />}>
          <div className="space-y-3">
            <p className="py-2 text-center text-sm text-slate-400">Nenhuma pessoa vinculada a este card</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setShowModal(true); setSearchTerm(""); }} className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-3 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30">
                <ExternalLink size={16} /> Vincular
              </button>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-3 font-medium text-slate-900 dark:text-green-400 transition-colors hover:bg-green-500/30">
                <Plus size={16} /> Cadastrar
              </button>
            </div>
          </div>
        </ExpandableSection>
        {searchModal}
        {showCreateModal && <PersonModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreated} person={null} />}
      </>
    );
  }

  return (
    <>
      <ExpandableSection title="Informação de Contato (Pessoa)" defaultExpanded={false} icon={<User size={18} />}>
        {loading ? <div className="py-4 text-center text-sm text-slate-400">Carregando...</div> : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"><User size={14} className="text-slate-400" /><span>Nome completo</span></div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2"><p className="text-slate-900 dark:text-white">{person?.name || "Não informado"}</p></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"><Briefcase size={14} className="text-slate-400" /><span>Cargo/Posição</span></div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2"><p className={person?.position ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}>{person?.position || "Não informado"}</p></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"><Mail size={14} className="text-slate-400" /><span>E-mail</span></div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2"><p className={(person?.email || person?.email_commercial) ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>{person?.email || person?.email_commercial || "Não informado"}</p></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"><Phone size={14} className="text-slate-400" /><span>Telefone</span></div>
              <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
                <div><p className="text-xs text-slate-400">Principal</p><p className={person?.phone ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>{formatPhone(person?.phone)}</p></div>
                <div><p className="text-xs text-slate-400">WhatsApp</p><p className={person?.phone_whatsapp ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>{formatPhone(person?.phone_whatsapp)}</p></div>
              </div>
            </div>
            {person?.linkedin && /^https?:\/\//i.test(person.linkedin) && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">LinkedIn</div>
                <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-400 hover:underline"><Linkedin size={14} /> Ver perfil</a>
              </div>
            )}
            <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
              <ActionButton icon={<ExternalLink size={16} />} label="Modificar cadastro da pessoa" onClick={() => setShowEditModal(true)} variant="warning" className="w-full" />
              <ActionButton icon={<Trash2 size={16} />} label="Desvincular pessoa" onClick={handleUnlink} variant="danger" className="w-full" />
            </div>
          </div>
        )}
      </ExpandableSection>
      {showEditModal && person && <PersonModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={async () => { setShowEditModal(false); if (card.person_id) setPerson(await personService.getById(card.person_id)); }} person={person} />}
    </>
  );
};

// ─── Placeholder de aba ─────────────────────────────────────────────────────────

const TabPlaceholder: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="mb-3 text-slate-300 dark:text-slate-600">{icon}</div>
    <p className="text-lg font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Em breve para o board de serviços.</p>
  </div>
);

// ─── Pipeline visual (posição do card entre as listas) ──────────────────────────

const ServicePipelineStages: React.FC<{
  lists: ServiceList[];
  currentListId: number;
  onMove: (listId: number) => void;
  isMoving?: boolean;
}> = ({ lists, currentListId, onMove, isMoving = false }) => {
  if (lists.length === 0) return null;

  const currentPosition = lists.findIndex((l) => l.id === currentListId);

  const getClasses = (list: ServiceList, index: number) => {
    const isCurrent = list.id === currentListId;
    const isPassed = index < currentPosition;
    if (isCurrent) {
      return { container: "bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30", text: "text-slate-900 dark:text-emerald-400 font-semibold", dot: "bg-emerald-500" };
    }
    if (isPassed) {
      return {
        container: "bg-blue-500/10 border-blue-500/50 cursor-pointer",
        text: "text-slate-900 dark:text-blue-400",
        dot: "bg-blue-500",
      };
    }
    return {
      container: "bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 cursor-pointer",
      text: "text-slate-900 dark:text-slate-400",
      dot: "bg-slate-600",
    };
  };

  const getLineClasses = (index: number) => {
    if (index < currentPosition) return "bg-blue-500";
    if (index === currentPosition) return "bg-gradient-to-r from-emerald-500 to-slate-700";
    return "bg-gray-200 dark:bg-slate-700";
  };

  return (
    <div className="relative">
      {isMoving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 font-medium text-blue-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Movendo card...</span>
          </div>
        </div>
      )}
      <div className={`scrollbar-thin flex items-center gap-1 overflow-x-auto px-1 py-2 ${isMoving ? "pointer-events-none opacity-60" : ""}`}>
        {lists.map((list, index) => {
          const classes = getClasses(list, index);
          const isPassed = index < currentPosition;
          const isCurrent = list.id === currentListId;
          return (
            <React.Fragment key={list.id}>
              <button
                onClick={() => { if (!isCurrent) onMove(list.id); }}
                disabled={isCurrent}
                className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 ${classes.container} ${isCurrent ? "cursor-not-allowed" : ""}`}
                title={isCurrent ? `Etapa atual: ${list.name}` : `Mover para: ${list.name}`}
              >
                <div className="relative flex items-center justify-center">
                  {isPassed || isCurrent ? (
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${classes.dot}`}>
                      {isPassed && <Check size={12} className="text-slate-900 dark:text-white" />}
                      {isCurrent && <div className="h-2 w-2 animate-pulse rounded-full bg-white" />}
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-slate-600" />
                  )}
                </div>
                <span className={`whitespace-nowrap text-sm ${classes.text}`}>{list.name}</span>
                {list.is_done_stage && <span className="ml-1 rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">Concluído</span>}
                {list.is_lost_stage && <span className="ml-1 rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">Perdido</span>}
              </button>
              {index < lists.length - 1 && (
                <div className="relative flex items-center">
                  <div className={`h-0.5 w-6 transition-all ${getLineClasses(index)}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ─── Página principal ───────────────────────────────────────────────────────────

const ServiceCardDetails: React.FC = () => {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const numBoardId = Number(boardId);
  const numCardId = Number(cardId);

  const [card, setCard] = useState<ServiceCard | null>(null);
  const [lists, setLists] = useState<ServiceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("atividade");

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [activities, setActivities] = useState<ServiceCardActivity[]>([]);
  const [contactPerson, setContactPerson] = useState<Person | null>(null);
  const [isQuickCalling, setIsQuickCalling] = useState(false);
  const [quickCallNumbers, setQuickCallNumbers] = useState<{ label: string; number: string }[] | null>(null);

  const reloadActivities = async () => {
    try {
      setActivities(await serviceActivityService.list(numBoardId, numCardId));
    } catch { /* silencioso */ }
  };

  const loadCard = async () => {
    try {
      setLoading(true);
      const [cardData, listsData] = await Promise.all([
        serviceBoardService.getCard(numBoardId, numCardId),
        serviceBoardService.getLists(numBoardId),
      ]);
      setCard(cardData);
      setTitleValue(cardData.title);
      setLists([...listsData].sort((a, b) => a.position - b.position));
      reloadActivities();
    } catch (error: any) {
      console.error("Erro ao carregar card:", error);
      showError("Erro ao carregar card de serviço.");
      navigate(`/servicos/${numBoardId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (numBoardId && numCardId) loadCard();
  }, [numBoardId, numCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega a pessoa vinculada (telefone usado na ligação do Foco)
  useEffect(() => {
    const loadPerson = async () => {
      if (card?.person_id) {
        try { setContactPerson(await personService.getById(card.person_id)); }
        catch { setContactPerson(null); }
      } else {
        setContactPerson(null);
      }
    };
    loadPerson();
  }, [card?.person_id]);

  const updateCard = async (data: Parameters<typeof serviceBoardService.updateCard>[2]) => {
    const updated = await serviceBoardService.updateCard(numBoardId, numCardId, data);
    setCard((prev) => (prev ? { ...prev, ...updated } : updated));
    reloadActivities();
    return updated;
  };

  // Badge de contagem por aba (Foco / Anotações / Arquivos)
  const tabBadge = (key: TabKey): number | undefined => {
    if (key === "atividade") return activities.filter((a) => a.category === "atividade" && !a.is_completed).length;
    if (key === "anotacoes") return activities.filter((a) => a.category === "anotacao").length;
    if (key === "arquivos") return activities.filter((a) => a.category === "arquivo").length;
    return undefined;
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) { setTitleValue(card?.title || ""); setEditingTitle(false); return; }
    try {
      await updateCard({ title: titleValue.trim() });
      setEditingTitle(false);
      showSuccess("Título atualizado!");
    } catch {
      showError("Erro ao atualizar título");
    }
  };

  const handleMove = async (newListId: number) => {
    if (newListId === card?.list_id) return;
    setIsMoving(true);
    try {
      await serviceBoardService.moveCard(numBoardId, numCardId, newListId);
      setCard((prev) => (prev ? { ...prev, list_id: newListId } : prev));
      reloadActivities();
      showSuccess("Card movido!");
    } catch {
      showError("Erro ao mover card");
    } finally {
      setIsMoving(false);
    }
  };

  // ─── Ligação rápida (header) ────────────────────────────────────────────────
  const phonesOf = (p: Person | null) => {
    if (!p) return [] as { label: string; number: string }[];
    return [
      p.phone && { label: "Principal", number: p.phone },
      p.phone_whatsapp && { label: "WhatsApp", number: p.phone_whatsapp },
      p.phone_commercial && { label: "Comercial", number: p.phone_commercial },
      p.phone_alternative && { label: "Alternativo", number: p.phone_alternative },
      p.phone_extra1 && { label: "Extra 1", number: p.phone_extra1 },
      p.phone_extra2 && { label: "Extra 2", number: p.phone_extra2 },
    ].filter(Boolean) as { label: string; number: string }[];
  };

  const hasOpenCall = activities.some((a) => a.category === "atividade" && a.activity_type === "call" && !a.is_completed);

  const execQuickCall = async (phone: string) => {
    setIsQuickCalling(true);
    try {
      const r = await api4comService.makeCall({ phone, service_card_id: numCardId });
      if (r.success) showSuccess("Chamada iniciada! O webphone abrirá automaticamente.");
      else showError(`Erro ao iniciar chamada: ${r.error || r.message}`);
      reloadActivities();
    } catch (e: any) {
      showError(`Erro ao iniciar chamada: ${e.response?.data?.detail || e.message}`);
    } finally {
      setIsQuickCalling(false);
      setQuickCallNumbers(null);
    }
  };

  const handleQuickCall = () => {
    if (!contactPerson) { showError("Nenhuma pessoa vinculada ao card"); return; }
    const nums = phonesOf(contactPerson);
    if (nums.length === 0) { showError("A pessoa vinculada não possui telefone cadastrado"); return; }
    if (nums.length === 1) { execQuickCall(nums[0].number); return; }
    setQuickCallNumbers(nums);
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: "Deletar card", message: "Deseja deletar este card? Esta ação não pode ser desfeita.", confirmText: "Deletar", isDanger: true });
    if (!ok) return;
    try {
      await serviceBoardService.deleteCard(numBoardId, numCardId);
      showSuccess("Card deletado!");
      navigate(`/servicos/${numBoardId}`);
    } catch {
      showError("Erro ao deletar card");
    }
  };

  if (loading || !card) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando card...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/servicos/${numBoardId}`)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
            title="Voltar para o board"
          >
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") { setTitleValue(card.title); setEditingTitle(false); } }}
                  autoFocus
                  className="flex-1 rounded-lg border border-blue-500 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 text-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <button onClick={handleSaveTitle} className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30"><Check size={18} /></button>
                <button onClick={() => { setTitleValue(card.title); setEditingTitle(false); }} className="rounded-lg bg-gray-200/50 dark:bg-slate-700/50 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{card.title}</h1>
                <button onClick={() => setEditingTitle(true)} className="text-slate-400 opacity-0 transition-opacity hover:text-blue-400 group-hover:opacity-100" title="Editar título"><Pencil size={16} /></button>
              </div>
            )}
          </div>
          <button onClick={handleDelete} className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20">
            <Trash2 size={16} /> Deletar
          </button>
        </div>

        {/* Pipeline visual — posição do card entre as listas */}
        <div className="mt-3">
          <ServicePipelineStages lists={lists} currentListId={card.list_id} onMove={handleMove} isMoving={isMoving} />
        </div>
      </div>

      {/* Conteúdo: 30/70 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Coluna esquerda — 30% */}
        <div className="w-full flex-shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 p-4 dark:border-slate-700/50 lg:w-[30%] lg:border-b-0 lg:border-r">
          <ServiceSummarySection card={card} onUpdate={async (d) => { await updateCard(d); showSuccess("Card atualizado!"); }} />
          <ServiceClientSection card={card} onLink={async (id) => { await updateCard({ client_id: id }); showSuccess(id ? "Cliente vinculado!" : "Cliente desvinculado!"); }} />
          <ServiceContactSection card={card} onLink={async (id) => { await updateCard({ person_id: id }); showSuccess(id ? "Pessoa vinculada!" : "Pessoa desvinculada!"); }} />
          <ServiceProductSection
            boardId={numBoardId}
            cardId={numCardId}
            paymentInfo={card.payment_info}
            onSavePaymentInfo={async (pi) => { await updateCard({ payment_info: pi }); showSuccess("Card atualizado!"); }}
            onChange={reloadActivities}
          />
        </div>

        {/* Coluna direita — 70% */}
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {/* Abas */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 dark:border-slate-700/50 dark:bg-slate-900/30">
            <div className="flex flex-1 gap-1 overflow-x-auto">
              {TABS.map((tab) => {
                const badge = tabBadge(tab.key);
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-violet-500 text-violet-500 dark:text-violet-400"
                        : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {badge !== undefined && badge > 0 && (
                      <span className="rounded-full bg-violet-500/20 px-1.5 text-xs text-violet-400">{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botão de ligação rápida (sempre visível) */}
            <button
              onClick={handleQuickCall}
              disabled={isQuickCalling || hasOpenCall || !card.person_id}
              title={
                hasOpenCall ? "Já existe uma atividade de ligação em aberto"
                : !card.person_id ? "Nenhuma pessoa vinculada ao card"
                : "Ligar agora para o contato"
              }
              className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isQuickCalling ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
              {(hasOpenCall || !card.person_id) && !isQuickCalling && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                    <line x1="4" y1="4" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo da aba */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {activeTab === "atividade" && (
              <ServiceActivityTab boardId={numBoardId} cardId={numCardId} activities={activities} reload={reloadActivities} contact={contactPerson} />
            )}
            {activeTab === "anotacoes" && (
              <ServiceNotesTab boardId={numBoardId} cardId={numCardId} activities={activities} reload={reloadActivities} />
            )}
            {activeTab === "arquivos" && (
              <ServiceFilesTab boardId={numBoardId} cardId={numCardId} activities={activities} reload={reloadActivities} />
            )}
            {(activeTab === "calendario" || activeTab === "ligacoes" || activeTab === "reunioes" || activeTab === "email") &&
              TABS.filter((t) => t.key === activeTab).map((t) => (
                <TabPlaceholder key={t.key} label={t.label} icon={React.cloneElement(t.icon as React.ReactElement<{ size?: number }>, { size: 48 })} />
              ))}
          </div>
        </div>
      </div>

      {/* Modal de seleção de número para ligação rápida (2+ números) */}
      {quickCallNumbers && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setQuickCallNumbers(null)}>
          <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Ligar para {contactPerson?.name}</h3>
              <button onClick={() => setQuickCallNumbers(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-2 p-4">
              {quickCallNumbers.map((p) => (
                <button key={p.label + p.number} onClick={() => execQuickCall(p.number)} disabled={isQuickCalling}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50 disabled:opacity-60">
                  <div>
                    <p className="text-xs text-slate-400">{p.label}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.number}</p>
                  </div>
                  <Phone size={16} className="text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ServiceCardDetails;
