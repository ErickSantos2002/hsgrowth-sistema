import React, { useState, useEffect } from "react";
import { FileText, Plus, Link2, Search, X, Eye, Pencil, Download, Trash2, History } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import proposalService, { Proposal, ProposalCreate } from "../../services/proposalService";
import serviceBoardService from "../../services/serviceBoardService";
import ProposalModal from "../proposals/ProposalModal";
import ProposalHistoryModal from "../proposals/ProposalHistoryModal";
import { markerBadge } from "../../utils/proposalMarker";
import { buildDefaultOtherItems } from "../../utils/proposalDefaults";
import { viewProposalPdf, downloadProposalPdf } from "../../utils/proposalPdf";
import { showError, showSuccess } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

interface ServiceProposalsSectionProps {
  boardId: number;
  cardId: number;
  /** Avisa o pai quando as propostas mudam (para recalcular o Valor do negócio do card). */
  onChange?: () => void;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
};

const ServiceProposalsSection: React.FC<ServiceProposalsSectionProps> = ({ boardId, cardId, onChange }) => {
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
  const [historyId, setHistoryId] = useState<number | null>(null);
  const { confirm } = useConfirm();

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
      // Modelo/Aparelhos dinâmicos no texto padrão (a partir dos aparelhos do card)
      let modelo = "";
      let aparelhos = "";
      try {
        const summary = await serviceBoardService.getCardProducts(boardId, cardId);
        const items = summary.items || [];
        const aparelhosList = items.flatMap((it) => it.aparelhos || []);
        let models = Array.from(new Set(aparelhosList.map((a) => a.model).filter(Boolean) as string[]));
        if (models.length === 0) {
          models = Array.from(new Set(items.map((it) => it.product_name).filter(Boolean) as string[]));
        }
        modelo = models.join(", ");
        aparelhos = Array.from(new Set(aparelhosList.map((a) => a.serial_number).filter(Boolean) as string[])).join(", ");
      } catch {
        /* sem produtos/aparelhos — mantém em branco */
      }
      prefill.other_items = buildDefaultOtherItems(modelo, aparelhos);
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

  const handleDelete = async (p: Proposal) => {
    const ok = await confirm({
      title: "Desvincular proposta",
      message: `Desvincular a proposta #${p.number} deste card?`,
      confirmText: "Desvincular",
      isDanger: true,
    });
    if (!ok) return;
    try {
      await proposalService.unlinkCard(p.id, cardId);
      showSuccess(`Proposta #${p.number} desvinculada`);
      loadProposals();
      onChange?.();
    } catch {
      showError("Erro ao desvincular a proposta");
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    loadProposals();
    onChange?.();
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
      setAvailable(
        data.items.filter((p) => !p.linked_cards?.some((lc) => lc.card_id === cardId)),
      );
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
      await proposalService.linkCard(p.id, cardId);
      showSuccess(`Proposta #${p.number} vinculada ao card`);
      setLinkOpen(false);
      loadProposals();
      onChange?.();
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
                        onClick={() => viewProposalPdf(p.id)}
                        title="Visualizar PDF"
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
                        onClick={() => downloadProposalPdf(p.id, p.number)}
                        title="Baixar PDF"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:hover:bg-slate-700/50 dark:hover:text-white"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => setHistoryId(p.id)}
                        title="Histórico"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-purple-500 dark:hover:bg-slate-700/50"
                      >
                        <History size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        title="Desvincular deste card"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={15} />
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

      <ProposalHistoryModal
        isOpen={historyId !== null}
        proposalId={historyId ?? 0}
        onClose={() => setHistoryId(null)}
      />
    </>
  );
};

export default ServiceProposalsSection;
