import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Inbox,
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
  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  // Vendedor: "pending" | "completed"
  // Admin/Gerente: "received" | "all"
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "received" | "all">(
    isManagerOrAdmin ? "received" : "pending"
  );
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Dados de transferências
  const [pendingTransfers, setPendingTransfers] = useState<CardTransfer[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<CardTransfer[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<TransferApproval[]>([]);
  const [statistics, setStatistics] = useState<TransferStatistics | null>(null);

  // Estados para admin/gerente
  const [allTransfers, setAllTransfers] = useState<CardTransfer[]>([]);

  // Paginação
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [allTransfersPage, setAllTransfersPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Recarrega dados quando a tab ativa muda
    if (activeTab === "pending") {
      loadPendingTransfers();
    } else if (activeTab === "completed") {
      loadCompletedTransfers();
    } else if (activeTab === "received") {
      loadPendingApprovals();
    } else if (activeTab === "all") {
      loadAllTransfers();
    }
  }, [activeTab, pendingPage, completedPage, allTransfersPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stats] = await Promise.all([
        transferService.getStatistics(),
      ]);
      setStatistics(stats);

      // Carrega dados da tab ativa inicial
      if (isManagerOrAdmin) {
        await loadPendingApprovals();
      } else {
        await loadPendingTransfers();
      }
    } catch (error) {
      console.error("Erro ao carregar dados de transferências:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTransfers = async () => {
    try {
      const response = await transferService.getSentTransfers(pendingPage, 20);
      // Filtra apenas pendentes
      const pending = response.transfers.filter(t => t.status === "pending_approval");
      setPendingTransfers(pending);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao carregar transferências pendentes:", error);
      setPendingTransfers([]);
    }
  };

  const loadCompletedTransfers = async () => {
    try {
      const response = await transferService.getSentTransfers(completedPage, 50);
      // Filtra apenas completed e rejected
      const completed = response.transfers.filter(
        t => t.status === "completed" || t.status === "rejected"
      );
      setCompletedTransfers(completed);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao carregar transferências finalizadas:", error);
      setCompletedTransfers([]);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const approvalsResponse = await transferService.getPendingApprovals(1, 50);
      setPendingApprovals(approvalsResponse.approvals);
    } catch (error) {
      console.error("Erro ao carregar aprovações pendentes:", error);
      setPendingApprovals([]);
    }
  };

  const loadAllTransfers = async () => {
    try {
      setLoading(true);
      const response = await transferService.getAllTransfers(allTransfersPage, 50);
      // Filtra apenas completed e rejected (transferências finalizadas)
      const completed = response.transfers.filter(
        t => t.status === "completed" || t.status === "rejected"
      );
      setAllTransfers(completed);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Erro ao carregar transferências finalizadas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      await transferService.decideApproval(approvalId, {
        decision: "approved",
      });

      // Recarrega dados
      await loadPendingApprovals();
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
        decision: "rejected",
        notes,
      });

      // Recarrega dados
      await loadPendingApprovals();
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft size={16} className="text-blue-400" />
              <span className="text-xs text-slate-400">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.total_transfers}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-400" />
              <span className="text-xs text-slate-400">Pendentes</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.pending_approvals}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-xs text-slate-400">Hoje</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.completed_today}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-xs text-slate-400">Esta Semana</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.completed_this_week}</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-cyan-400" />
              <span className="text-xs text-slate-400">Este Mês</span>
            </div>
            <div className="text-2xl font-bold text-white">{statistics.completed_this_month}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {/* Tabs para VENDEDORES */}
        {!isManagerOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === "pending"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>Transferências Pendentes</span>
                {pendingTransfers.length > 0 && (
                  <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingTransfers.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === "completed"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                <span>Transferências Finalizadas</span>
              </div>
            </button>
          </>
        )}

        {/* Tabs para ADMIN/GERENTE */}
        {isManagerOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab("received")}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === "received"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Inbox size={18} />
                <span>Aprovações Pendentes</span>
                {pendingApprovals.length > 0 && (
                  <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingApprovals.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === "all"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                <span>Transferências Finalizadas</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
        {/* Tab: Transferências Pendentes (Vendedor) */}
        {activeTab === "pending" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferências Pendentes</h2>
            <p className="text-slate-400 mb-4">Aguardando aprovação do gerente</p>
            {pendingTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferência pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendingTransfers.map((transfer) => (
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

        {/* Tab: Aprovações Pendentes (Admin/Gerente) */}
        {activeTab === "received" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Aprovações Pendentes</h2>
            <p className="text-slate-400 mb-4">Transferências aguardando sua decisão</p>

            {pendingApprovals.length === 0 ? (
              <p className="text-slate-400 text-center py-12">Nenhuma aprovação pendente.</p>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  {pendingApprovals.length} transferência{pendingApprovals.length > 1 ? 's' : ''} aguardando
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
          </div>
        )}

        {/* Tab: Transferências Finalizadas (Vendedor) */}
        {activeTab === "completed" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferências Finalizadas</h2>
            <p className="text-slate-400 mb-4">Transferências aprovadas ou rejeitadas</p>
            {completedTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferência finalizada ainda.</p>
            ) : (
              <div className="space-y-3">
                {completedTransfers.map((transfer) => (
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

        {/* Tab: Transferências Finalizadas (Admin/Gerente) */}
        {activeTab === "all" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferências Finalizadas</h2>
            <p className="text-slate-400 mb-4">Todas as transferências aprovadas ou rejeitadas do sistema</p>
            {allTransfers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">Nenhuma transferência finalizada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">{
              allTransfers.map((transfer) => (
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
                          <span className="font-medium">De:</span> {transfer.from_user_name || "Desconhecido"} →{" "}
                          <span className="font-medium">Para:</span> {transfer.to_user_name || "Desconhecido"}
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
          if (activeTab === "pending") {
            loadPendingTransfers();
          } else if (activeTab === "completed") {
            loadCompletedTransfers();
          }
        }}
      />
    </div>
  );
};

export default Transfers;
