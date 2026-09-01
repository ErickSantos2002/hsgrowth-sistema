import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  Filter,
} from "lucide-react";
import BaseModal from "../common/BaseModal";
import cardService from "../../services/cardService";
import boardService from "../../services/boardService";
import userService from "../../services/userService";
import { Board, Card, CardFilters, User } from "../../types";
import { showSuccess, showError } from "../../utils/toast";
import { useAuth } from "../../hooks/useAuth";

/**
 * Props do componente ExportCardsModal
 */
interface ExportCardsModalProps {
  /** Modal visível ou não */
  isOpen: boolean;
  /** Callback para fechar */
  onClose: () => void;
  /** Lista de boards já carregada na página pai */
  boards: Board[];
}

/** Opções de status do card para o filtro */
type StatusFilter = "all" | "open" | "won" | "lost";

/**
 * Formata uma data ISO para exibição no padrão DD/MM/AAAA
 * Retorna string vazia se a data for nula/inválida
 */
const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    // Usa apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso
    const [year, month, day] = dateStr.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
};

/**
 * Determina o status legível do card
 */
const getCardStatus = (card: Card): string => {
  if (card.is_won) return "Ganho";
  if (card.is_lost) return "Perdido";
  return "Aberto";
};

/**
 * Modal de exportação de cards para Excel
 *
 * Permite filtrar por board, status, etapa, vendedor, SDR, período de criação
 * e nome do cliente antes de gerar o arquivo .xlsx.
 *
 * Lógica de permissão (espelha o KanbanBoard):
 * - admin/manager → vendedor e SDR livres
 * - salesperson   → filtro de vendedor travado no próprio ID
 * - sdr           → filtro de SDR travado no próprio ID
 */
const ExportCardsModal: React.FC<ExportCardsModalProps> = ({
  isOpen,
  onClose,
  boards,
}) => {
  const { user } = useAuth();

  // Salesperson trava no filtro de Vendedor; SDR trava no filtro de SDR
  const isVendorLocked = user?.role === "salesperson";
  const isSdrLocked = user?.role === "sdr";

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const [selectedBoardId, setSelectedBoardId] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [selectedListId, setSelectedListId] = useState<number | "all">("all");
  // Vendedor: salesperson parte do próprio ID travado; demais partem de "all"
  const [selectedUserId, setSelectedUserId] = useState<number | "all">(
    isVendorLocked ? (user?.id ?? "all") : "all"
  );
  // SDR: sdr parte do próprio ID travado; demais partem de "all"
  const [selectedSdrId, setSelectedSdrId] = useState<number | "all">(
    isSdrLocked ? (user?.id ?? "all") : "all"
  );
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [closeDateStart, setCloseDateStart] = useState("");
  const [closeDateEnd, setCloseDateEnd] = useState("");


  // ─── Dados auxiliares ─────────────────────────────────────────────────────
  const [lists, setLists] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  // Quem pode figurar como SDR: cargo SDR + ex-SDR com card (RN-037)
  const [sdrIds, setSdrIds] = useState<number[]>([]);

  // ─── Estados de carregamento ──────────────────────────────────────────────
  const [loadingLists, setLoadingLists] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Carrega lista de usuários ativos ao abrir o modal e reaplica travas de permissão
  useEffect(() => {
    if (isOpen) {
      userService.listActive().then(setUsers).catch(console.error);
      userService.listSdrs().then((us) => setSdrIds(us.map((u) => u.id))).catch(console.error);

      // Reaplica travamento caso o modal seja reaberto
      if (isVendorLocked && user?.id) setSelectedUserId(user.id);
      if (isSdrLocked && user?.id) setSelectedSdrId(user.id);
    }
  }, [isOpen]);

  // Carrega etapas/listas quando um board específico é selecionado
  useEffect(() => {
    if (selectedBoardId !== "all") {
      setLoadingLists(true);
      setSelectedListId("all"); // reseta seleção de lista ao trocar board
      boardService
        .getLists(selectedBoardId as number)
        .then(setLists)
        .catch(console.error)
        .finally(() => setLoadingLists(false));
    } else {
      setLists([]);
      setSelectedListId("all");
    }
  }, [selectedBoardId]);

  // Reseta filtros ao fechar respeitando as travas de cada role
  const handleClose = () => {
    setSelectedBoardId("all");
    setSelectedStatus("all");
    setSelectedListId("all");
    setSelectedUserId(isVendorLocked ? (user?.id ?? "all") : "all");
    setSelectedSdrId(isSdrLocked ? (user?.id ?? "all") : "all");
    setDateStart("");
    setDateEnd("");
    setCloseDateStart("");
    setCloseDateEnd("");
    onClose();
  };

  /**
   * Busca os cards aplicando os filtros de API e depois aplica
   * filtros adicionais client-side (status, datas, busca de cliente)
   */
  const fetchCards = async (): Promise<Card[]> => {
    // Boards a buscar: todos os não-deletados ou apenas o selecionado
    const boardsToFetch =
      selectedBoardId === "all"
        ? boards.filter((b) => !b.is_deleted)
        : boards.filter((b) => b.id === selectedBoardId);

    if (boardsToFetch.length === 0) return [];

    // Filtros que o backend suporta
    const apiFilters: CardFilters = {
      all: true,
      ...(selectedListId !== "all" && { list_id: selectedListId as number }),
      ...(selectedUserId !== "all" && { assigned_to_id: selectedUserId as number }),
    };

    // Busca em paralelo para cada board
    const results = await Promise.all(
      boardsToFetch.map((b) =>
        cardService.list({ ...apiFilters, board_id: b.id })
      )
    );

    let cards = results.flatMap((r) => r.cards);

    // Filtro de SDR (client-side — sdr_id não está no CardFilters da API)
    if (selectedSdrId !== "all") {
      cards = cards.filter((c) => (c as any).sdr_id === selectedSdrId);
    }

    // Filtro de status (client-side — conversão -1/0/1 pode variar no backend)
    if (selectedStatus === "open") cards = cards.filter((c) => !c.is_won && !c.is_lost);
    if (selectedStatus === "won") cards = cards.filter((c) => c.is_won);
    if (selectedStatus === "lost") cards = cards.filter((c) => c.is_lost);

    // Filtro de período de criação (compara YYYY-MM-DD para evitar problemas de TZ)
    if (dateStart) {
      cards = cards.filter((c) => c.created_at.slice(0, 10) >= dateStart);
    }
    if (dateEnd) {
      cards = cards.filter((c) => c.created_at.slice(0, 10) <= dateEnd);
    }

    // Filtro de período de fechamento (won_at ou lost_at)
    if (closeDateStart || closeDateEnd) {
      cards = cards.filter((c) => {
        const closeDate = ((c as any).won_at ?? (c as any).lost_at)?.slice(0, 10);
        if (!closeDate) return false;
        if (closeDateStart && closeDate < closeDateStart) return false;
        if (closeDateEnd && closeDate > closeDateEnd) return false;
        return true;
      });
    }

    return cards;
  };

  /**
   * Gera o arquivo Excel com os cards filtrados
   */
  const exportToExcel = (cards: Card[]) => {
    const wb = XLSX.utils.book_new();

    // Cabeçalhos da planilha
    const headers = [
      "ID",
      "Título",
      "Board",
      "Etapa",
      "Status",
      "Vendedor",
      "SDR",
      // Empresa
      "Cliente",
      "CNPJ",
      // Contato
      "Contato",
      "Tel. Contato",
      "Email Contato",
      // Negócio
      "Valor (R$)",
      "Forma de Pgto.",
      "Parcelas",
      "Produto(s)",
      // Datas
      "Criado em",
      "Vencimento",
      "Fechado em",
      // Origem
      "Tipo de negócio",
      "Canal de aquisição",
      "Det. canal",
      "Motivo de perda",
      "Tarefas pendentes",
    ];

    // Linhas de dados
    const rows = cards.map((c) => [
      c.id,
      c.title,
      c.board_name ?? "",
      c.list_name ?? "",
      getCardStatus(c),
      c.assigned_to_name ?? "",
      c.sdr_name ?? "",
      // Empresa
      c.client_name ?? "",
      c.client_document ?? "",
      // Contato
      c.person_name ?? "",
      c.person_phone_whatsapp ?? c.person_phone ?? "",
      c.person_email ?? "",
      // Negócio
      c.value ?? "",
      c.payment_info?.payment_method ?? "",
      c.payment_info?.installments ?? "",
      c.product_names ?? "",
      // Datas
      formatDateBR(c.created_at),
      formatDateBR(c.due_date),
      formatDateBR(c.won_at ?? c.lost_at),
      // Origem
      c.deal_type ?? "",
      c.acquisition_channel ?? "",
      c.acquisition_channel_detail ?? "",
      c.loss_reason ?? "",
      c.pending_tasks_count ?? 0,
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // ─── Estilo do cabeçalho ─────────────────────────────────────────────
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { patternType: "solid", fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };

    headers.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellRef]) {
        ws[cellRef].s = headerStyle;
      }
    });

    // ─── Estilo alternado nas linhas de dados ────────────────────────────
    const rowStyleEven = {
      fill: { patternType: "solid", fgColor: { rgb: "F0F4F8" } },
      border: {
        bottom: { style: "thin", color: { rgb: "DDDDDD" } },
        left: { style: "thin", color: { rgb: "DDDDDD" } },
        right: { style: "thin", color: { rgb: "DDDDDD" } },
      },
    };
    const rowStyleOdd = {
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      border: {
        bottom: { style: "thin", color: { rgb: "DDDDDD" } },
        left: { style: "thin", color: { rgb: "DDDDDD" } },
        right: { style: "thin", color: { rgb: "DDDDDD" } },
      },
    };

    rows.forEach((row, rowIdx) => {
      const style = rowIdx % 2 === 0 ? rowStyleEven : rowStyleOdd;
      row.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        if (ws[cellRef]) {
          ws[cellRef].s = style;
        }
      });
    });

    // ─── Largura das colunas ─────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 6 },  // ID
      { wch: 32 }, // Título
      { wch: 20 }, // Board
      { wch: 22 }, // Etapa
      { wch: 10 }, // Status
      { wch: 22 }, // Vendedor
      { wch: 20 }, // SDR
      { wch: 28 }, // Cliente
      { wch: 18 }, // CNPJ
      { wch: 26 }, // Contato
      { wch: 18 }, // Tel. Contato
      { wch: 28 }, // Email Contato
      { wch: 15 }, // Valor
      { wch: 16 }, // Forma de Pgto
      { wch: 10 }, // Parcelas
      { wch: 28 }, // Produto(s)
      { wch: 13 }, // Criado em
      { wch: 13 }, // Vencimento
      { wch: 13 }, // Fechado em
      { wch: 22 }, // Tipo de negócio
      { wch: 26 }, // Canal de aquisição
      { wch: 26 }, // Det. canal
      { wch: 30 }, // Motivo de perda
      { wch: 17 }, // Tarefas pendentes
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Cards");

    // Gera e faz download do arquivo
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const today = new Date().toISOString().slice(0, 10);
    saveAs(blob, `cards-hsgrowth-${today}.xlsx`);

    showSuccess(
      `${cards.length} card${cards.length !== 1 ? "s" : ""} exportado${cards.length !== 1 ? "s" : ""} com sucesso!`
    );
  };

  /**
   * Handler principal do botão Exportar
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const cards = await fetchCards();

      if (cards.length === 0) {
        showError("Nenhum card encontrado com os filtros selecionados.");
        return;
      }

      exportToExcel(cards);
      handleClose();
    } catch (error) {
      console.error("Erro ao exportar cards:", error);
      showError("Erro ao exportar cards. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  // Boards ativos (não deletados) para o dropdown
  const activeBoards = boards.filter((b) => !b.is_deleted);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Exportar Cards"
      subtitle="Configure os filtros e exporte para Excel (.xlsx)"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          {/* Indicador de ajuda */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <Filter size={14} className="mr-1 inline" />
            Filtros sem seleção incluem todos os registros
          </p>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={exporting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Exportar Excel
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Ícone decorativo */}
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <FileSpreadsheet size={22} className="shrink-0 text-green-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Os dados serão exportados com todas as informações dos cards conforme
            os filtros abaixo.
          </p>
        </div>

        {/* ── Linha 1: Board ─────────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Board
          </label>
          <select
            value={selectedBoardId}
            onChange={(e) =>
              setSelectedBoardId(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="all">Todos os boards</option>
            {activeBoards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Linha 2: Status + Etapa ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="open">Aberto</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
          </div>

          {/* Etapa/Lista — só aparece quando um board específico está selecionado */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Etapa / Lista
            </label>
            <select
              value={selectedListId}
              onChange={(e) =>
                setSelectedListId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              disabled={selectedBoardId === "all" || loadingLists}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {selectedBoardId === "all" ? (
                <option value="all">Selecione um board primeiro</option>
              ) : loadingLists ? (
                <option value="all">Carregando...</option>
              ) : (
                <>
                  <option value="all">Todas as etapas</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* ── Linha 3: Vendedor + SDR ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Vendedor */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Vendedor
              {isVendorLocked && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-normal text-amber-600 dark:text-amber-400">
                  travado
                </span>
              )}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) =>
                setSelectedUserId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              disabled={isVendorLocked}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {!isVendorLocked && (
                <option value="all">Todos os vendedores</option>
              )}
              {/* Exibe apenas usuários com role salesperson */}
              {users
                .filter((u) => u.role === "salesperson")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>

          {/* SDR */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              SDR
              {isSdrLocked && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-normal text-amber-600 dark:text-amber-400">
                  travado
                </span>
              )}
            </label>
            <select
              value={selectedSdrId}
              onChange={(e) =>
                setSelectedSdrId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              disabled={isSdrLocked}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {!isSdrLocked && (
                <option value="all">Todos os SDRs</option>
              )}
              {/* Exibe quem atua ou já atuou como SDR (RN-037) */}
              {users
                .filter((u) => sdrIds.includes(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* ── Linha 4: Período de criação ─────────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Período de criação
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">até</span>
            <div className="flex-1">
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                min={dateStart || undefined}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* ── Linha 5: Período de fechamento ──────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Período de fechamento
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="date"
                value={closeDateStart}
                onChange={(e) => setCloseDateStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">até</span>
            <div className="flex-1">
              <input
                type="date"
                value={closeDateEnd}
                onChange={(e) => setCloseDateEnd(e.target.value)}
                min={closeDateStart || undefined}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

      </div>
    </BaseModal>
  );
};

export default ExportCardsModal;
