import React, { useState, useEffect } from "react";
import { FileText, Plus, Link2, Search, X, Eye, Pencil, Download } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import proposalService, { Proposal, ProposalCreate } from "../../services/proposalService";
import ProposalModal from "../proposals/ProposalModal";
import { markerBadge } from "../../utils/proposalMarker";
import { showError, showSuccess } from "../../utils/toast";

interface ServiceProposalsSectionProps {
  boardId: number;
  cardId: number;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
};

const ServiceProposalsSection: React.FC<ServiceProposalsSectionProps> = ({ boardId: _boardId, cardId }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initial, setInitial] = useState<ProposalCreate | undefined>(undefined);

  // Vincular proposta existente (sem card)
  const [linkOpen, setLinkOpen] = useState(false);
  const [available, setAvailable] = useState<Proposal[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);

  const loadProposals = async () => {
    try {
      const data = await proposalService.listByCard(cardId);
      setProposals(data);
    } catch {
      showError("Erro ao carregar propostas do card");
    }
  };

  useEffect(() => {
    loadProposals();
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewProposal = async () => {
    try {
      setLoading(true);
      const prefill = await proposalService.prefillFromCard(cardId);
      setInitial(prefill);
      setEditingId(null);
      setModalOpen(true);
    } catch {
      showError("Erro ao pré-preencher proposta");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (p: Proposal) => {
    setInitial(undefined);
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    loadProposals();
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingId(null);
    setInitial(undefined);
  };

  // Abre o painel de vínculo e carrega as propostas sem card (em aberto)
  const handleOpenLink = async () => {
    setLinkOpen(true);
    setLinkSearch("");
    setLinkLoading(true);
    try {
      const data = await proposalService.list(1, 500);
      setAvailable(data.items.filter((p) => !p.service_card_id));
    } catch {
      showError("Erro ao carregar propostas disponíveis");
    } finally {
      setLinkLoading(false);
    }
  };

  // Vincula a proposta escolhida a este card
  const handleLink = async (p: Proposal) => {
    setLinkingId(p.id);
    try {
      await proposalService.update(p.id, { service_card_id: cardId });
      showSuccess(`Proposta #${p.number} vinculada ao card`);
      setLinkOpen(false);
      loadProposals();
    } catch {
      showError("Erro ao vincular proposta");
    } finally {
      setLinkingId(null);
    }
  };

  const filteredAvailable = available.filter((p) => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return true;
    return String(p.number).includes(q) || (p.client_name || "").toLowerCase().includes(q);
  });

  return (
    <>
      <ExpandableSection
        title="Propostas"
        defaultExpanded={false}
        icon={<FileText size={18} />}
        badge={proposals.length > 0 ? proposals.length : undefined}
      >
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <div className="py-4 text-center">
              <FileText size={28} className="mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-400">Nenhuma proposta vinculada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proposals.map((p) => {
                const badge = markerBadge(p.marker);
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-slate-900 dark:text-white text-sm whitespace-nowrap">
                          #{p.number}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(p.date)}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatCurrency(p.total)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Visualizar"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-blue-500 dark:hover:bg-slate-700/50"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Editar"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-emerald-500 dark:hover:bg-slate-700/50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        disabled
                        title="Baixar PDF (em breve — fase 2)"
                        className="cursor-not-allowed rounded p-1.5 text-slate-300 dark:text-slate-600"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Painel de vincular proposta existente */}
          {linkOpen && (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Vincular proposta existente (sem card)
                </span>
                <button onClick={() => setLinkOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Buscar por número ou cliente..."
                  className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 pl-7 pr-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {linkLoading ? (
                  <p className="py-2 text-center text-xs text-slate-400">Carregando...</p>
                ) : filteredAvailable.length === 0 ? (
                  <p className="py-2 text-center text-xs text-slate-400">Nenhuma proposta disponível</p>
                ) : (
                  filteredAvailable.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleLink(p)}
                      disabled={linkingId !== null}
                      className="flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 disabled:opacity-50"
                    >
                      <span className="min-w-0 truncate text-slate-900 dark:text-white">
                        <span className="font-medium">#{p.number}</span>
                        {p.client_name ? <span className="text-slate-500 dark:text-slate-400"> · {p.client_name}</span> : null}
                      </span>
                      <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {linkingId === p.id ? "Vinculando..." : formatCurrency(p.total)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleNewProposal}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
            >
              <Plus size={18} />
              {loading ? "Carregando..." : "Nova proposta"}
            </button>
            <button
              onClick={handleOpenLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100/50 dark:bg-slate-800/50 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
            >
              <Link2 size={16} />
              Vincular existente
            </button>
          </div>
        </div>
      </ExpandableSection>

      <ProposalModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        proposalId={editingId ?? undefined}
        initial={initial}
      />
    </>
  );
};

export default ServiceProposalsSection;
