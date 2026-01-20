import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Send,
  Inbox,
  History,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import transferService from "../services/transferService";
import { CardTransfer, TransferApproval, TransferStatistics } from "../types";
import { useAuth } from "../hooks/useAuth";
import TransferModal from "../components/transfers/TransferModal";

const Transfers: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "history">("sent");
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Dados de transferências
  const [sentTransfers, setSentTransfers] = useState<CardTransfer[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<CardTransfer[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<TransferApproval[]>([]);
  const [statistics, setStatistics] = useState<TransferStatistics | null>(null);

  // Paginação
  const [sentPage, setSentPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Recarrega dados quando a tab ativa muda
    if (activeTab === "sent") {
      loadSentTransfers();
    } else if (activeTab === "received") {
      loadReceivedTransfers();
    } else if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, sentPage, receivedPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stats] = await Promise.all([
        transferService.getStatistics(),
      ]);
      setStatistics(stats);

      // Carrega dados da tab ativa
      await loadSentTransfers();
    } catch (error) {
      console.error("Erro ao carregar dados de transferências:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSentTransfers = async () => {
    try {
      const response = await transferService.getSentTransfers(sentPage, 20);
      setSentTransfers(response.transfers);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao carregar transferências enviadas:", error);
      setSentTransfers([]);
    }
  };

  const loadReceivedTransfers = async () => {
    try {
      const [receivedResponse, approvalsResponse] = await Promise.all([
        transferService.getReceivedTransfers(receivedPage, 20),
        transferService.getPendingApprovals(1, 50),
      ]);
      setReceivedTransfers(receivedResponse.transfers);
      setPendingApprovals(approvalsResponse.approvals);
      setTotalPages(receivedResponse.total_pages);
    } catch (error) {
      console.error("Erro ao carregar transferências recebidas:", error);
      setReceivedTransfers([]);
      setPendingApprovals([]);
    }
  };

  const loadHistory = async () => {
    try {
      // Carrega tanto enviadas quanto recebidas para histórico completo
      const [sentResponse, receivedResponse] = await Promise.all([
        transferService.getSentTransfers(1, 50),
        transferService.getReceivedTransfers(1, 50),
      ]);

      // Combina e ordena por data (mais recentes primeiro)
      const allTransfers = [...sentResponse.transfers, ...receivedResponse.transfers];
      allTransfers.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSentTransfers(allTransfers);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      await transferService.decideApproval(approvalId, {
        decision: "approve",
      });

      // Recarrega dados
      await loadReceivedTransfers();
      await loadInitialData();

      alert("Transferência aprovada com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar transferência:", error);
      alert("Erro ao aprovar transferência");
    }
  };

  const handleReject = async (approvalId: number, notes?: string) => {
    try {
      await transferService.decideApproval(approvalId, {
        decision: "reject",
        notes,
      });

      // Recarrega dados
      await loadReceivedTransfers();
      await loadInitialData();

      alert("Transferência rejeitada com sucesso!");
    } catch (error) {
      console.error("Erro ao rejeitar transferência:", error);
      alert("Erro ao rejeitar transferência");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-400" size={20} />;
      case "rejected":
        return <XCircle className="text-red-400" size={20} />;
      case "pending_approval":
        return <Clock className="text-yellow-400" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando transferências...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ArrowRightLeft className="text-emerald-400" size={32} />
            Transferências de Cards
          </h1>
          <p className="text-slate-400 mt-1">
            Gerencie solicitações de transferência de cards entre usuários
          </p>
        </div>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Transferência
        </button>
      </div>

      {/* Estatísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Send size={16} className="text-blue-400" />
              <span className="text-xs text-slate-400">Enviadas</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.total_sent}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Inbox size={16} className="text-purple-400" />
              <span className="text-xs text-slate-400">Recebidas</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.total_received}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-400" />
              <span className="text-xs text-slate-400">Pendentes</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.pending_approvals}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-xs text-slate-400">Aprovadas</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.approved_count}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-400" />
              <span className="text-xs text-slate-400">Rejeitadas</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.rejected_count}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-gray-400" />
              <span className="text-xs text-slate-400">Expiradas</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.expired_count}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "sent"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Send size={16} />
            Minhas Solicitações
          </div>
        </button>
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "received"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Inbox size={16} />
            Recebidas
            {pendingApprovals.length > 0 && (
              <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "history"
              ? "text-emerald-400 border-emerald-400"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <History size={16} />
            Histórico
          </div>
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
        {activeTab === "sent" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferências Enviadas</h2>
            {sentTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferência enviada ainda.</p>
            ) : (
              <div className="space-y-3">
                {sentTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(transfer.status)}
                          <h3 className="font-semibold text-white">
                            {transfer.card_title || `Card #${transfer.card_id}`}
                          </h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${transferService.getStatusColor(
                              transfer.status
                            )}`}
                          >
                            {transferService.formatStatus(transfer.status)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>
                            <span className="font-medium">Para:</span> {transfer.to_user_name}
                          </p>
                          <p>
                            <span className="font-medium">Motivo:</span>{" "}
                            {transferService.formatReason(transfer.reason)}
                          </p>
                          {transfer.notes && (
                            <p>
                              <span className="font-medium">Observações:</span> {transfer.notes}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            Criada em {formatDate(transfer.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "received" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferências Recebidas</h2>

            {/* Aprovações Pendentes */}
            {pendingApprovals.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  Aguardando sua aprovação ({pendingApprovals.length})
                </h3>
                <div className="space-y-3">
                  {pendingApprovals.map((approval) => {
                    const transfer = approval.transfer;
                    if (!transfer) return null;

                    return (
                      <div
                        key={approval.id}
                        className="bg-yellow-900/20 border-2 border-yellow-500/50 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-2">
                              {transfer.card_title || `Card #${transfer.card_id}`}
                            </h4>
                            <div className="text-sm text-slate-300 space-y-1">
                              <p>
                                <span className="font-medium">De:</span> {transfer.from_user_name}
                              </p>
                              <p>
                                <span className="font-medium">Motivo:</span>{" "}
                                {transferService.formatReason(transfer.reason)}
                              </p>
                              {transfer.notes && (
                                <p>
                                  <span className="font-medium">Observações:</span> {transfer.notes}
                                </p>
                              )}
                              <p className="text-xs text-slate-400">
                                Expira em {formatDate(approval.expires_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          >
                            <CheckCircle size={16} />
                            Aprovar
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt("Motivo da rejeição (opcional):");
                              handleReject(approval.id, notes || undefined);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            <XCircle size={16} />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Todas as transferências recebidas */}
            {receivedTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferência recebida ainda.</p>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Todas as transferências recebidas</h3>
                <div className="space-y-3">
                  {receivedTransfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(transfer.status)}
                            <h4 className="font-semibold text-white">
                              {transfer.card_title || `Card #${transfer.card_id}`}
                            </h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${transferService.getStatusColor(
                                transfer.status
                              )}`}
                            >
                              {transferService.formatStatus(transfer.status)}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400 space-y-1">
                            <p>
                              <span className="font-medium">De:</span> {transfer.from_user_name}
                            </p>
                            <p>
                              <span className="font-medium">Motivo:</span>{" "}
                              {transferService.formatReason(transfer.reason)}
                            </p>
                            {transfer.notes && (
                              <p>
                                <span className="font-medium">Observações:</span> {transfer.notes}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              Criada em {formatDate(transfer.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Histórico Completo</h2>
            {sentTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferência no histórico.</p>
            ) : (
              <div className="space-y-3">
                {sentTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(transfer.status)}
                          <h4 className="font-semibold text-white">
                            {transfer.card_title || `Card #${transfer.card_id}`}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${transferService.getStatusColor(
                              transfer.status
                            )}`}
                          >
                            {transferService.formatStatus(transfer.status)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>
                            <span className="font-medium">De:</span> {transfer.from_user_name} →{" "}
                            <span className="font-medium">Para:</span> {transfer.to_user_name}
                          </p>
                          <p>
                            <span className="font-medium">Motivo:</span>{" "}
                            {transferService.formatReason(transfer.reason)}
                          </p>
                          {transfer.notes && (
                            <p>
                              <span className="font-medium">Observações:</span> {transfer.notes}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {formatDate(transfer.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de nova transferência */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={() => {
          // Recarrega dados após criar transferência
          loadInitialData();
          if (activeTab === "sent") {
            loadSentTransfers();
          }
        }}
      />
    </div>
  );
};

export default Transfers;
