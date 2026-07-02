import React, { useState, useEffect } from "react";
import { FileText, Plus } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import proposalService, { Proposal, ProposalCreate } from "../../services/proposalService";
import ProposalModal from "../proposals/ProposalModal";
import { markerBadge } from "../../utils/proposalMarker";
import { showError } from "../../utils/toast";

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
                  <button
                    key={p.id}
                    onClick={() => handleOpenEdit(p)}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-100/50 dark:hover:bg-slate-700/50"
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
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={handleNewProposal}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
          >
            <Plus size={18} />
            {loading ? "Carregando..." : "Nova proposta"}
          </button>
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
