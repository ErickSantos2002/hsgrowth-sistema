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

  // Dados de transferncias
  const [pendingTransfers, setPendingTransfers] = useState<CardTransfer[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<CardTransfer[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<TransferApproval[]>([]);
  const [statistics, setStatistics] = useState<TransferStatistics | null>(null);

  // Estados para admin/gerente
  const [allTransfers, setAllTransfers] = useState<CardTransfer[]>([]);

  // Paginao
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [allTransfersPage, setAllTransfersPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [pendingPageSize, setPendingPageSize] = useState(7);
  const [completedPageSize, setCompletedPageSize] = useState(7);
  const [allTransfersTotalPages, setAllTransfersTotalPages] = useState(1);
  const [allTransfersTotal, setAllTransfersTotal] = useState(0);
  const [allTransfersPageSize, setAllTransfersPageSize] = useState(7);
  const [pendingApprovalsPage, setPendingApprovalsPage] = useState(1);
  const [pendingApprovalsTotalPages, setPendingApprovalsTotalPages] = useState(1);
  const [pendingApprovalsTotal, setPendingApprovalsTotal] = useState(0);
  const [pendingApprovalsPageSize, setPendingApprovalsPageSize] = useState(7);

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
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "received") {
      loadPendingApprovals();
    }
  }, [pendingApprovalsPage]);

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
      console.error("Erro ao carregar dados de transferncias:", error);
    } finally {
      setLoading(false);
    }
  };

  
  const loadPendingTransfers = async () => {
    try {
      const response = await transferService.getSentTransfers(1, 50);
      const allTransfers = [...response.transfers];
      for (let page = 2; page <= response.total_pages; page += 1) {
        const nextResponse = await transferService.getSentTransfers(page, 50);
        allTransfers.push(...nextResponse.transfers);
      }

      // Filtra apenas pendentes
      const pending = allTransfers.filter(t => t.status === "pending_approval");
      const nextTotal = pending.length;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pendingPageSize));

      setPendingTransfers(pending);
      setPendingTotal(nextTotal);
      setPendingTotalPages(nextTotalPages);
      setPendingPage((page) => Math.min(page, nextTotalPages));
    } catch (error) {
      console.error("Erro ao carregar transfer?ncias pendentes:", error);
      setPendingTransfers([]);
    }
  };


  
  const loadCompletedTransfers = async () => {
    try {
      const response = await transferService.getSentTransfers(1, 50);
      const allTransfers = [...response.transfers];
      for (let page = 2; page <= response.total_pages; page += 1) {
        const nextResponse = await transferService.getSentTransfers(page, 50);
        allTransfers.push(...nextResponse.transfers);
      }

      // Filtra apenas completed e rejected
      const completed = allTransfers.filter(
        t => t.status === "completed" || t.status === "rejected"
      );
      const nextTotal = completed.length;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / completedPageSize));

      setCompletedTransfers(completed);
      setCompletedTotal(nextTotal);
      setCompletedTotalPages(nextTotalPages);
      setCompletedPage((page) => Math.min(page, nextTotalPages));
    } catch (error) {
      console.error("Erro ao carregar transfer?ncias finalizadas:", error);
      setCompletedTransfers([]);
    }
  };


  
  const loadPendingApprovals = async () => {
    try {
      const approvalsResponse = await transferService.getPendingApprovals(pendingApprovalsPage, 7);
      setPendingApprovals(approvalsResponse.approvals);
      setPendingApprovalsTotal(approvalsResponse.total);
      setPendingApprovalsTotalPages(approvalsResponse.total_pages);
      setPendingApprovalsPageSize(approvalsResponse.page_size);
    } catch (error) {
      console.error("Erro ao carregar aprova????es pendentes:", error);
      setPendingApprovals([]);
    }
  };


  
  const loadAllTransfers = async () => {
    try {
      setLoading(true);
      const response = await transferService.getAllTransfers(1, 50);
      const allTransfers = [...response.transfers];
      for (let page = 2; page <= response.total_pages; page += 1) {
        const nextResponse = await transferService.getAllTransfers(page, 50);
        allTransfers.push(...nextResponse.transfers);
      }

      // Filtra apenas completed e rejected (transfer?ncias finalizadas)
      const completed = allTransfers.filter(
        t => t.status === "completed" || t.status === "rejected"
      );
      const nextTotal = completed.length;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / allTransfersPageSize));

      setAllTransfers(completed);
      setAllTransfersTotal(nextTotal);
      setAllTransfersTotalPages(nextTotalPages);
      setAllTransfersPage((page) => Math.min(page, nextTotalPages));
    } catch (error) {
      console.error("Erro ao carregar transfer?ncias finalizadas:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (approvalId: number) => {
    try {
      await transferService.decideApproval(approvalId, {
        decision: "approve",
      });

      // Recarrega dados
      await loadPendingApprovals();
      await loadInitialData();

      alert("Transferncia aprovada com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar transferncia:", error);
      alert("Erro ao aprovar transferncia");
    }
  };

  const handleReject = async (approvalId: number, notes?: string) => {
    try {
      await transferService.decideApproval(approvalId, {
        decision: "reject",
        notes,
      });

      // Recarrega dados
      await loadPendingApprovals();
      await loadInitialData();

      alert("Transferncia rejeitada com sucesso!");
    } catch (error) {
      console.error("Erro ao rejeitar transferncia:", error);
      alert("Erro ao rejeitar transferncia");
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

  const getPageNumbers = (currentPage: number, total: number) => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const renderPagination = (
    currentPage: number,
    total: number,
    totalItems: number,
    pageSize: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalItems === 0 || total <= 1) return null;

    const safePage = Math.min(currentPage, total);
    const safePageSize = pageSize > 0 ? pageSize : 1;
    const startIndex = (safePage - 1) * safePageSize + 1;
    const endIndex = Math.min(safePage * safePageSize, totalItems);
    const pageNumbers = getPageNumbers(safePage, total);

    return (
      <div className="flex flex-col gap-4 border-t border-slate-700/60 pt-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="text-sm text-slate-400">
          Mostrando {startIndex} a {endIndex} de {totalItems} registros
        </div>
        <div className="flex items-center justify-center gap-3 sm:justify-end">
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                safePage === 1
                  ? "border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"
              }`}
            >
              {"<"}
            </button>
            <div className="flex min-w-[42px] items-center justify-center rounded-lg border border-slate-600 px-2 py-2 text-sm text-white">
              {safePage}
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(total, safePage + 1))}
              disabled={safePage === total}
              className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                safePage === total
                  ? "border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"
              }`}
            >
              {">"}
            </button>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                safePage === 1
                  ? "border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
              }`}
            >
              Anterior
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                  page === safePage
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageChange(Math.min(total, safePage + 1))}
              disabled={safePage === total}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                safePage === total
                  ? "border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
              }`}
            >
              Proxima
            </button>
          </div>
        </div>
      </div>
    );
  };

  const pendingStartIndex = (pendingPage - 1) * pendingPageSize;
  const completedStartIndex = (completedPage - 1) * completedPageSize;
  const allTransfersStartIndex = (allTransfersPage - 1) * allTransfersPageSize;
  const paginatedPendingTransfers = pendingTransfers.slice(
    pendingStartIndex,
    pendingStartIndex + pendingPageSize
  );
  const paginatedCompletedTransfers = completedTransfers.slice(
    completedStartIndex,
    completedStartIndex + completedPageSize
  );
  const paginatedAllTransfers = allTransfers.slice(
    allTransfersStartIndex,
    allTransfersStartIndex + allTransfersPageSize
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando transferncias...</p>
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
            Transferncias de Cards
          </h1>
          <p className="text-slate-400 mt-1">
            Gerencie solicitaes de transferncia de cards entre usurios
          </p>
        </div>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Transferncia
        </button>
      </div>

      {/* Estatsticas */}
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
              <span className="text-xs text-slate-400">Este Ms</span>
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
                <span>Transferncias Pendentes</span>
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
                <span>Transferncias Finalizadas</span>
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
                <span>Aprovaes Pendentes</span>
                {pendingApprovals.length > 0 && (
                  <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingApprovalsTotal}
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
                <span>Transferncias Finalizadas</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Contedo das Tabs */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
        {/* Tab: Transferncias Pendentes (Vendedor) */}
        {activeTab === "pending" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferncias Pendentes</h2>
            <p className="text-slate-400 mb-4">Aguardando aprovao do gerente</p>
            {pendingTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferncia pendente.</p>
            ) : (
              <div className="space-y-3">
                {paginatedPendingTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transfer.status)}
                            <h3 className="font-semibold text-white">
                              {transfer.card_title || `Card #${transfer.card_id}`}
                            </h3>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              transfer.status === "pending_approval"
                                ? "bg-yellow-500 text-slate-900"
                                : transfer.status === "completed"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
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
                              <span className="font-medium">Observaes:</span> {transfer.notes}
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
            {renderPagination(
              pendingPage,
              pendingTotalPages,
              pendingTotal,
              pendingPageSize,
              setPendingPage
            )}
          </div>
        )}

        {/* Tab: Aprovaes Pendentes (Admin/Gerente) */}
        {activeTab === "received" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Aprovaes Pendentes</h2>
            <p className="text-slate-400 mb-4">Transferncias aguardando sua deciso</p>

            {pendingApprovals.length === 0 ? (
              <p className="text-slate-400 text-center py-12">Nenhuma aprovao pendente.</p>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  {pendingApprovalsTotal} {"transfer\u00EAncias"}
                  {pendingApprovalsTotal > 1 ? "s" : ""} aguardando
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
                                  <span className="font-medium">Observaes:</span> {transfer.notes}
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
                              const notes = prompt("Motivo da rejeio (opcional):");
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
            {renderPagination(
              pendingApprovalsPage,
              pendingApprovalsTotalPages,
              pendingApprovalsTotal,
              pendingApprovalsPageSize,
              setPendingApprovalsPage
            )}
          </div>
        )}

        {/* Tab: Transferncias Finalizadas (Vendedor) */}
        {activeTab === "completed" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferncias Finalizadas</h2>
            <p className="text-slate-400 mb-4">Transferncias aprovadas ou rejeitadas</p>
            {completedTransfers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma transferncia finalizada ainda.</p>
            ) : (
              <div className="space-y-3">
                {paginatedCompletedTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transfer.status)}
                            <h4 className="font-semibold text-white">
                              {transfer.card_title || `Card #${transfer.card_id}`}
                            </h4>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              transfer.status === "completed"
                                ? "bg-green-500 text-white"
                                : transfer.status === "rejected"
                                ? "bg-red-500 text-white"
                                : "bg-yellow-500 text-slate-900"
                            }`}
                          >
                            {transferService.formatStatus(transfer.status)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>
                            <span className="font-medium">De:</span> {transfer.from_user_name} {" "}
                            <span className="font-medium">Para:</span> {transfer.to_user_name}
                          </p>
                          <p>
                            <span className="font-medium">Motivo:</span>{" "}
                            {transferService.formatReason(transfer.reason)}
                          </p>
                          {transfer.notes && (
                            <p>
                              <span className="font-medium">Observaes:</span> {transfer.notes}
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
            {renderPagination(
              completedPage,
              completedTotalPages,
              completedTotal,
              completedPageSize,
              setCompletedPage
            )}
          </div>
        )}

        {/* Tab: Transferncias Finalizadas (Admin/Gerente) */}
        {activeTab === "all" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transferncias Finalizadas</h2>
            <p className="text-slate-400 mb-4">Todas as transferncias aprovadas ou rejeitadas do sistema</p>
            {allTransfers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">Nenhuma transferncia finalizada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">{
              paginatedAllTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transfer.status)}
                          <h4 className="font-semibold text-white">
                            {transfer.card_title || `Card #${transfer.card_id}`}
                          </h4>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            transfer.status === "completed"
                              ? "bg-green-500 text-white"
                              : transfer.status === "rejected"
                              ? "bg-red-500 text-white"
                              : "bg-yellow-500 text-slate-900"
                          }`}
                        >
                          {transferService.formatStatus(transfer.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        <p>
                          <span className="font-medium">De:</span> {transfer.from_user_name || "Desconhecido"} {" "}
                          <span className="font-medium">Para:</span> {transfer.to_user_name || "Desconhecido"}
                        </p>
                        <p>
                          <span className="font-medium">Motivo:</span>{" "}
                          {transferService.formatReason(transfer.reason)}
                        </p>
                        {transfer.notes && (
                          <p>
                            <span className="font-medium">Observaes:</span> {transfer.notes}
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
            {renderPagination(
              allTransfersPage,
              allTransfersTotalPages,
              allTransfersTotal,
              allTransfersPageSize,
              setAllTransfersPage
            )}
          </div>
        )}
      </div>

      {/* Modal de nova transferncia */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={() => {
          // Recarrega dados aps criar transferncia
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
