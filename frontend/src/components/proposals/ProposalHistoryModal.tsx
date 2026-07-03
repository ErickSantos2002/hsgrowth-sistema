import React, { useEffect, useState } from "react";
import { Eye, Download } from "lucide-react";
import { BaseModal } from "../common";
import proposalService, { ProposalVersion } from "../../services/proposalService";
import { viewVersionPdf, downloadVersionPdf } from "../../utils/proposalPdf";

interface ProposalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: number;
}

// Formata data-hora ISO para dd/mm/aaaa HH:mm
const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const formatCurrency = (value: unknown): string => {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const ProposalHistoryModal: React.FC<ProposalHistoryModalProps> = ({
  isOpen,
  onClose,
  proposalId,
}) => {
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen || !proposalId) return;
    let active = true;
    setLoading(true);
    setError(false);
    proposalService
      .listVersions(proposalId)
      .then((data) => {
        if (active) setVersions(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, proposalId]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Histórico da proposta" size="lg">
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Carregando histórico...
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-red-500">
          Erro ao carregar o histórico da proposta.
        </div>
      ) : versions.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhuma versão anterior
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => {
            const snap = v.snapshot ?? {};
            const numero = snap.number as number | string | undefined;
            const clientName = snap.client_name as string | undefined;
            const total = snap.total;
            return (
              <div
                key={v.id}
                className="rounded-lg border border-gray-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      #v{v.version_number}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(v.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => viewVersionPdf(proposalId, v.id)}
                      disabled={!v.has_pdf}
                      title={v.has_pdf ? "Visualizar PDF" : "PDF indisponível"}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-slate-700/50"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() =>
                        downloadVersionPdf(proposalId, v.id, `${numero ?? proposalId}-v${v.version_number}`)
                      }
                      disabled={!v.has_pdf}
                      title={v.has_pdf ? "Baixar PDF" : "PDF indisponível"}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Proposta: </span>
                    {numero != null ? `#${numero}` : "—"}
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Cliente: </span>
                    {clientName || "—"}
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Total: </span>
                    {total != null ? formatCurrency(total) : "—"}
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Alterado por: </span>
                    {v.changed_by || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BaseModal>
  );
};

export default ProposalHistoryModal;
