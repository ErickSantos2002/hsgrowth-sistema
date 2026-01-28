import React, { useState, useEffect, useRef } from "react";
import { ArrowRightLeft, AlertCircle, ChevronDown } from "lucide-react";
import BaseModal from "../common/BaseModal";
import transferService from "../../services/transferService";
import userService from "../../services/userService";
import cardService from "../../services/cardService";
import boardService from "../../services/boardService";
import { TransferReason, User, Card } from "../../types";
import { useAuth } from "../../hooks/useAuth";

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

      setUsers(activeUsers);
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
        page: 1,
        size: 100,
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
      alert("Por favor, selecione um board primeiro");
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
        alert("Transferência criada com sucesso!");
      } else {
        await transferService.createBatchTransfer({
          card_ids: batchFormData.card_ids,
          to_user_id: batchFormData.to_user_id,
          reason: batchFormData.reason,
          notes: batchFormData.notes || undefined,
        });
        alert(
          `Transferência em lote criada com sucesso! ${batchFormData.card_ids.length} cards transferidos.`
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao criar transferência:", error);
      alert(
        error.response?.data?.detail ||
          "Erro ao criar transferência. Tente novamente."
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
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Modo de Transferência
            </label>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Modo de Transferência">
              <button
                type="button"
                role="radio"
                aria-checked={transferMode === "single"}
                onClick={() => setTransferMode("single")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  transferMode === "single"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-200 hover:border-slate-500"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    transferMode === "single" ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                Card Único
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={transferMode === "batch"}
                onClick={() => setTransferMode("batch")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  transferMode === "batch"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-200 hover:border-slate-500"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    transferMode === "batch" ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                Transferência em Lote
              </button>
            </div>
          </div>
        )}

        {/* Seleção de Board */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
            <p className="text-slate-400 text-xs mt-1">
              Selecione um board para ver os cards disponíveis
            </p>
          )}
          {loadingCards && (
            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-400"></div>
              Carregando cards...
            </p>
          )}
        </div>

        {/* Mensagem quando nenhum board selecionado */}
        {!selectedBoardId && (
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
            <p className="text-blue-300 text-sm text-center">
              Selecione um board acima para visualizar os cards disponíveis
            </p>
          </div>
        )}

        {/* Transferência Única */}
        {transferMode === "single" && selectedBoardId > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Card *
            </label>
            <select
              value={formData.card_id}
              onChange={(e) =>
                setFormData({ ...formData, card_id: Number(e.target.value) })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={!!preSelectedCardId || loading || loadingCards}
            >
              <option value={0}>
                {loadingCards
                  ? "Carregando cards..."
                  : myCards.length === 0
                  ? "Nenhum card disponível neste board"
                  : "Selecione um card"}
              </option>
              {myCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title} {card.list_name ? `(${card.list_name})` : ""}
                </option>
              ))}
            </select>
            {errors.card_id && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.card_id}
              </p>
            )}
          </div>
        )}

        {/* Transferência em Lote */}
        {transferMode === "batch" && selectedBoardId > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Cards * (máximo 50)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-emerald-400 hover:text-emerald-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                disabled={loadingCards || myCards.length === 0}
              >
                {batchFormData.card_ids.length === myCards.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </button>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {loadingCards ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                  <p className="text-slate-400 text-sm">Carregando cards...</p>
                </div>
              ) : myCards.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  Você não possui cards atribuídos neste board
                </p>
              ) : (
                myCards.map((card) => (
                  <label
                    key={card.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors ${
                      batchFormData.card_ids.includes(card.id)
                        ? "bg-emerald-900/30 border border-emerald-500/50"
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
                      <p className="text-white text-sm font-medium">
                        {card.title}
                      </p>
                      {card.list_name && (
                        <p className="text-slate-400 text-xs">
                          {card.list_name}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="text-slate-400 text-xs mt-1">
              {batchFormData.card_ids.length} card(s) selecionado(s)
            </p>
            {errors.card_ids && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.card_ids}
              </p>
            )}
          </div>
        )}

        {/* Usuário Destinatário */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.to_user_id}
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            disabled={loading}
          />
        </div>

        {/* Alerta informativo */}
        <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
          <p className="text-blue-300 text-sm">
            <strong>Importante:</strong> Após criar a transferência, ela pode
            precisar de aprovação dependendo das configurações do sistema.
          </p>
        </div>
      </form>
    </BaseModal>
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
        className={`w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${
                option.value === value ? "bg-slate-800/70" : ""
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
