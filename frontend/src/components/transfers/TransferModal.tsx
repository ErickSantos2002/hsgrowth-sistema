import React, { useState, useEffect, useRef } from "react";
import { ArrowRightLeft, AlertCircle, ChevronDown, Search } from "lucide-react";
import BaseModal from "../common/BaseModal";
import transferService from "../../services/transferService";
import userService from "../../services/userService";
import cardService from "../../services/cardService";
import boardService from "../../services/boardService";
import { TransferReason, User, Card } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { showSuccess, showError, showWarning } from "../../utils/toast";
import { LoadingSpinner } from "../common";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedCardId?: number;
}

/**
 * Modal para criar nova transferência de card(s)
 * Permite transferir um único card ou múltiplos cards (batch)
 */
const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedCardId,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number>(0);
  const [myCards, setMyCards] = useState<Card[]>([]);

  // Modo de transferência: single ou batch
  const [transferMode, setTransferMode] = useState<"single" | "batch">("single");

  // Dados do formulário para transferência única
  const [formData, setFormData] = useState({
    card_id: preSelectedCardId || 0,
    to_user_id: 0,
    reason: "reassignment" as TransferReason,
    notes: "",
  });

  // Dados do formulário para transferência em lote
  const [batchFormData, setBatchFormData] = useState({
    card_ids: [] as number[],
    to_user_id: 0,
    reason: "reassignment" as TransferReason,
    notes: "",
  });

  // Busca textual para filtrar cards no modo batch
  const [batchSearchTerm, setBatchSearchTerm] = useState("");

  const [errors, setErrors] = useState<{
    card_id?: string;
    to_user_id?: string;
    card_ids?: string;
  }>({});

  // Opções de motivo de transferência
  const reasonOptions = [
    { value: "reassignment", label: "Reatribuição" },
    { value: "workload_balance", label: "Balanceamento de Carga" },
    { value: "expertise", label: "Especialização" },
    { value: "vacation", label: "Férias" },
    { value: "other", label: "Outro" },
  ];

  // Carrega dados iniciais quando abre o modal
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Atualiza card_id quando preSelectedCardId muda
  useEffect(() => {
    if (preSelectedCardId) {
      setFormData((prev) => ({ ...prev, card_id: preSelectedCardId }));
      setTransferMode("single");
    }
  }, [preSelectedCardId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Carrega usuários ativos e boards
      const [activeUsers, boardsResponse] = await Promise.all([
        userService.listActive(),
        boardService.list({
          page: 1,
          size: 100,
          is_deleted: false,
        }),
      ]);

      // Filtra apenas vendedores (salesperson) e exclui o próprio usuário logado
      const salespeople = activeUsers.filter(
        (u) => u.role === "salesperson" && u.id !== user?.id
      );
      setUsers(salespeople);
      setBoards(boardsResponse.boards || []);

      // Reset do formulário
      setFormData({
        card_id: preSelectedCardId || 0,
        to_user_id: 0,
        reason: "reassignment",
        notes: "",
      });

      setBatchFormData({
        card_ids: [],
        to_user_id: 0,
        reason: "reassignment",
        notes: "",
      });

      setErrors({});
      setSelectedBoardId(0);
      setMyCards([]);
      setBatchSearchTerm("");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega cards quando o board é selecionado
  const loadCardsFromBoard = async (boardId: number) => {
    if (!boardId || !user) {
      setMyCards([]);
      return;
    }

    try {
      setLoadingCards(true);

      const cardsResponse = await cardService.list({
        board_id: boardId,
        assigned_to_id: user.id, // Apenas cards atribuídos ao usuário logado
        is_won: false,            // is_won=0 no banco = abertos; exclui ganhos (1) e perdidos (-1)
        all: true,                // Sem paginação (lista já é pequena com os filtros acima)
        minimal: true,            // Retorna apenas campos essenciais para não sobrecarregar
      });

      setMyCards(cardsResponse.cards || []);
    } catch (error) {
      console.error("Erro ao carregar cards do board:", error);
      setMyCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  // Carrega cards quando o board selecionado muda
  useEffect(() => {
    if (selectedBoardId) {
      loadCardsFromBoard(selectedBoardId);
    } else {
      setMyCards([]);
    }
  }, [selectedBoardId]);

  const validateForm = (): boolean => {
    const newErrors: {
      card_id?: string;
      to_user_id?: string;
      card_ids?: string;
    } = {};

    // Valida seleção de board
    if (!selectedBoardId) {
      showWarning("Por favor, selecione um board primeiro");
      return false;
    }

    if (transferMode === "single") {
      if (!formData.card_id) {
        newErrors.card_id = "Selecione um card para transferir";
      }
      if (!formData.to_user_id) {
        newErrors.to_user_id = "Selecione o usuário destinatário";
      }
    } else {
      if (batchFormData.card_ids.length === 0) {
        newErrors.card_ids = "Selecione pelo menos um card";
      }
      if (batchFormData.card_ids.length > 50) {
        newErrors.card_ids = "Máximo de 50 cards por transferência";
      }
      if (!batchFormData.to_user_id) {
        newErrors.to_user_id = "Selecione o usuário destinatário";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (transferMode === "single") {
        await transferService.createTransfer({
          card_id: formData.card_id,
          to_user_id: formData.to_user_id,
          reason: formData.reason,
          notes: formData.notes || undefined,
        });
        showSuccess("Transferência criada com sucesso!");
      } else {
        await transferService.createBatchTransfer({
          card_ids: batchFormData.card_ids,
          to_user_id: batchFormData.to_user_id,
          reason: batchFormData.reason,
          notes: batchFormData.notes || undefined,
        });
        showSuccess(
          `Transferência em lote criada! ${batchFormData.card_ids.length} cards transferidos`
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao criar transferência:", error);
      showError(
        error.response?.data?.detail || "Erro ao criar transferência"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelection = (cardId: number) => {
    setBatchFormData((prev) => {
      const newCardIds = prev.card_ids.includes(cardId)
        ? prev.card_ids.filter((id) => id !== cardId)
        : [...prev.card_ids, cardId];
      return { ...prev, card_ids: newCardIds };
    });
  };

  const handleSelectAll = () => {
    if (batchFormData.card_ids.length === myCards.length) {
      // Desmarca todos
      setBatchFormData((prev) => ({ ...prev, card_ids: [] }));
    } else {
      // Marca todos (limitado a 50)
      setBatchFormData((prev) => ({
        ...prev,
        card_ids: myCards.slice(0, 50).map((card) => card.id),
      }));
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Transferência"
      titleClassName="text-lg sm:text-2xl"
      subtitle="Transfira card(s) para outro usuário"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Criando...
              </>
            ) : (
              <>
                <ArrowRightLeft size={16} />
                Criar Transferência
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Modo de Transferência */}
        {!preSelectedCardId && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Modo de Transferência
            </label>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Modo de Transferência">
              <button
                type="button"
                role="radio"
                aria-checked={transferMode === "single"}
                onClick={() => setTransferMode("single")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  transferMode === "single"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-gray-300 text-slate-700 hover:border-gray-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    transferMode === "single" ? "bg-emerald-400" : "bg-gray-300 dark:bg-slate-600"
                  }`}
                />
                Card Único
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={transferMode === "batch"}
                onClick={() => setTransferMode("batch")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  transferMode === "batch"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-gray-300 text-slate-700 hover:border-gray-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    transferMode === "batch" ? "bg-emerald-400" : "bg-gray-300 dark:bg-slate-600"
                  }`}
                />
                Transferência em Lote
              </button>
            </div>
          </div>
        )}

        {/* Seleção de Board */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Board *
          </label>
          <SelectMenu
            value={String(selectedBoardId)}
            options={[
              { value: "0", label: "Selecione um board" },
              ...boards.map((board) => ({
                value: String(board.id),
                label: board.name,
              })),
            ]}
            onChange={(value) => {
              const boardId = Number(value);
              setSelectedBoardId(boardId);
              // Limpa seleções de cards quando muda o board
              setFormData({ ...formData, card_id: 0 });
              setBatchFormData({ ...batchFormData, card_ids: [] });
            }}
            disabled={loading}
          />
          {!selectedBoardId && (
            <p className="mt-1 text-xs text-slate-400">
              Selecione um board para ver os cards disponíveis
            </p>
          )}
          {loadingCards && (
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
              <LoadingSpinner size="sm" />
              Carregando cards...
            </div>
          )}
        </div>

        {/* Mensagem quando nenhum board selecionado */}
        {!selectedBoardId && (
          <div className="rounded-lg border border-blue-500/50 bg-blue-900/20 p-4">
            <p className="text-center text-sm text-blue-300">
              Selecione um board acima para visualizar os cards disponíveis
            </p>
          </div>
        )}

        {/* Transferência Única */}
        {transferMode === "single" && selectedBoardId > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Card *
            </label>
            <SearchableCardSelect
              value={formData.card_id}
              cards={myCards}
              onChange={(cardId) => setFormData({ ...formData, card_id: cardId })}
              disabled={!!preSelectedCardId || loading}
              loading={loadingCards}
            />
            {errors.card_id && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
                <AlertCircle size={14} />
                {errors.card_id}
              </p>
            )}
          </div>
        )}

        {/* Transferência em Lote */}
        {transferMode === "batch" && selectedBoardId > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Cards * (máximo 50)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={loadingCards || myCards.length === 0}
              >
                {batchFormData.card_ids.length === myCards.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </button>
            </div>
            {/* Campo de busca para filtrar os cards no modo batch */}
            {!loadingCards && myCards.length > 0 && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchTerm}
                  onChange={(e) => setBatchSearchTerm(e.target.value)}
                  placeholder="Pesquisar card..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            )}

            <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              {loadingCards ? (
                <div className="py-8 text-center">
                  <LoadingSpinner size="md" />
                  <p className="text-sm text-slate-400">Carregando cards...</p>
                </div>
              ) : myCards.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Você não possui cards atribuídos neste board
                </p>
              ) : myCards.filter((c) =>
                  c.title.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
                  (c.list_name && c.list_name.toLowerCase().includes(batchSearchTerm.toLowerCase()))
                ).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Nenhum card encontrado para "{batchSearchTerm}"
                </p>
              ) : (
                myCards.filter((c) =>
                  c.title.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
                  (c.list_name && c.list_name.toLowerCase().includes(batchSearchTerm.toLowerCase()))
                ).map((card) => (
                  <label
                    key={card.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-700/50 ${
                      batchFormData.card_ids.includes(card.id)
                        ? "border border-emerald-500/50 bg-emerald-900/30"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={batchFormData.card_ids.includes(card.id)}
                      onChange={() => handleCardSelection(card.id)}
                      className="text-emerald-500 focus:ring-emerald-500"
                      disabled={
                        !batchFormData.card_ids.includes(card.id) &&
                        batchFormData.card_ids.length >= 50
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {card.title}
                      </p>
                      {card.list_name && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {card.list_name}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {batchFormData.card_ids.length} card(s) selecionado(s)
            </p>
            {errors.card_ids && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
                <AlertCircle size={14} />
                {errors.card_ids}
              </p>
            )}
          </div>
        )}

        {/* Usuário Destinatário */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Transferir para *
          </label>
          <SelectMenu
            value={String(
              transferMode === "single"
                ? formData.to_user_id
                : batchFormData.to_user_id
            )}
            options={[
              { value: "0", label: "Selecione um usuário" },
              ...users.map((user) => ({
                value: String(user.id),
                label: user.name,
              })),
            ]}
            onChange={(value) => {
              const userId = Number(value);
              if (transferMode === "single") {
                setFormData({ ...formData, to_user_id: userId });
              } else {
                setBatchFormData({ ...batchFormData, to_user_id: userId });
              }
            }}
            disabled={loading}
          />
          {errors.to_user_id && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
              <AlertCircle size={14} />
              {errors.to_user_id}
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Motivo da Transferência *
          </label>
          <SelectMenu
            value={transferMode === "single" ? formData.reason : batchFormData.reason}
            options={reasonOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) => {
              const reason = value as TransferReason;
              if (transferMode === "single") {
                setFormData({ ...formData, reason });
              } else {
                setBatchFormData({ ...batchFormData, reason });
              }
            }}
            disabled={loading}
          />
        </div>

        {/* Observações */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Observações (opcional)
          </label>
          <textarea
            value={
              transferMode === "single" ? formData.notes : batchFormData.notes
            }
            onChange={(e) => {
              const notes = e.target.value;
              if (transferMode === "single") {
                setFormData({ ...formData, notes });
              } else {
                setBatchFormData({ ...batchFormData, notes });
              }
            }}
            rows={3}
            placeholder="Adicione detalhes sobre o motivo da transferência..."
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            disabled={loading}
          />
        </div>

        {/* Alerta informativo */}
        <div className="rounded-lg border border-blue-500/50 bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Importante:</strong> Após criar a transferência, ela pode
            precisar de aprovação dependendo das configurações do sistema.
          </p>
        </div>
      </form>
    </BaseModal>
  );
};

// ==================== COMPONENTE AUXILIAR: SELECT DE CARD COM BUSCA ====================

interface SearchableCardSelectProps {
  value: number;
  cards: Card[];
  onChange: (cardId: number) => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Select de card com campo de pesquisa embutido.
 * Essencial para listas grandes (centenas ou milhares de cards).
 */
const SearchableCardSelect: React.FC<SearchableCardSelectProps> = ({
  value,
  cards,
  onChange,
  disabled = false,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Foca no input de busca ao abrir o dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedCard = cards.find((c) => c.id === value);

  // Filtra cards pelo termo de busca (título ou nome da lista)
  const filteredCards = cards.filter(
    (card) =>
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.list_name &&
        card.list_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (cardId: number) => {
    onChange(cardId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const displayLabel = loading
    ? "Carregando cards..."
    : cards.length === 0
    ? "Nenhum card disponível neste board"
    : selectedCard
    ? `${selectedCard.title}${selectedCard.list_name ? ` (${selectedCard.list_name})` : ""}`
    : "Selecione um card";

  return (
    <div ref={menuRef} className="relative">
      {/* Botão principal que abre o dropdown */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen((open) => !open)}
        disabled={disabled || loading || cards.length === 0}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 ${
          disabled || loading || cards.length === 0
            ? "cursor-not-allowed opacity-60 text-slate-400"
            : "text-slate-900 dark:text-white"
        }`}
      >
        <span className={`truncate ${selectedCard ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown com busca */}
      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {/* Campo de busca */}
          <div className="border-b border-gray-200 p-2 dark:border-slate-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por título ou lista..."
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCards.length === 0 ? (
              <p className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                {searchTerm
                  ? `Nenhum card encontrado para "${searchTerm}"`
                  : "Nenhum card disponível"}
              </p>
            ) : (
              filteredCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSelect(card.id)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${
                    card.id === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
                  }`}
                >
                  <p className="truncate font-medium text-slate-900 dark:text-white">{card.title}</p>
                  {card.list_name && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{card.list_name}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Rodapé com contagem */}
          <div className="border-t border-gray-200 px-3 py-1.5 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {filteredCards.length} de {cards.length} card(s)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransferModal;
