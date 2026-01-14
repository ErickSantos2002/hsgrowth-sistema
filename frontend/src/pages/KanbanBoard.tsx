import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Download,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import boardService from "../services/boardService";
import listService from "../services/listService";
import cardService from "../services/cardService";
import { Board, List, Card } from "../types";
import KanbanList from "../components/kanban/KanbanList";
import KanbanCard from "../components/kanban/KanbanCard";
import ListModal from "../components/kanban/ListModal";
import ConfirmModal from "../components/kanban/ConfirmModal";
import CardModal, { CardFormData } from "../components/kanban/CardModal";
import BoardModal from "../components/kanban/BoardModal";

const KanbanBoard: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  // Estados
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Estados dos modais de lista
  const [showListModal, setShowListModal] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [deletingList, setDeletingList] = useState<List | null>(null);

  // Estados dos modais de card
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Configuração do sensor de drag (apenas pointer, mais responsivo)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Precisa arrastar 8px para ativar
      },
    })
  );

  /**
   * Carrega os dados do board ao montar o componente
   */
  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId]);

  /**
   * Carrega os dados do board, listas e cards
   */
  const loadBoardData = async () => {
    try {
      setLoading(true);

      // Carregar dados do board
      const boardData = await boardService.getById(Number(boardId));
      setBoard(boardData);

      // Carregar listas do board
      const listsData = await listService.list({ board_id: Number(boardId) });
      const sortedLists = listsData.sort((a, b) => a.position - b.position);
      setLists(sortedLists);

      // Carregar cards do board
      const cardsResponse = await cardService.list({ board_id: Number(boardId) });
      setCards(cardsResponse.cards || []);
    } catch (error) {
      console.error("Erro ao carregar board:", error);
      alert("Erro ao carregar board");
      navigate("/boards");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Volta para a página de boards
   */
  const handleBack = () => {
    navigate("/boards");
  };

  /**
   * Abre o modal para editar o board
   */
  const handleEditBoard = () => {
    setShowBoardMenu(false);
    setShowBoardModal(true);
  };

  /**
   * Salva as alterações do board
   */
  const handleSaveBoard = async (data: { name: string; description?: string; color: string; icon: string }) => {
    if (!board) return;

    try {
      await boardService.update(board.id, data);
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao salvar board:", error);
      alert("Erro ao salvar board");
    }
  };

  /**
   * Duplica o board
   */
  const handleDuplicateBoard = async () => {
    setShowBoardMenu(false);
    if (!board) return;

    try {
      await boardService.duplicate(board.id, `${board.name} - Cópia`);
      alert("Board duplicado com sucesso!");
      navigate("/boards");
    } catch (error) {
      console.error("Erro ao duplicar board:", error);
      alert("Erro ao duplicar board");
    }
  };

  /**
   * Arquiva o board
   */
  const handleArchiveBoard = async () => {
    setShowBoardMenu(false);
    if (!board) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja arquivar o board "${board.name}"?`
    );

    if (!confirmed) return;

    try {
      await boardService.update(board.id, { is_deleted: true });
      alert("Board arquivado com sucesso!");
      navigate("/boards");
    } catch (error) {
      console.error("Erro ao arquivar board:", error);
      alert("Erro ao arquivar board");
    }
  };

  /**
   * Exporta os cards do board
   */
  const handleExportCards = () => {
    setShowBoardMenu(false);
    // TODO: Implementar exportação
    alert("Exportar cards - TODO");
  };

  /**
   * Abre modal para criar nova lista
   */
  const handleCreateList = () => {
    setEditingList(null);
    setShowListModal(true);
  };

  /**
   * Abre modal para editar lista
   */
  const handleEditList = (list: List) => {
    setEditingList(list);
    setShowListModal(true);
  };

  /**
   * Salva lista (criar ou editar)
   */
  const handleSaveList = async (data: { name: string; color: string }) => {
    try {
      if (editingList) {
        // Editar lista existente
        await listService.update(Number(boardId), editingList.id, data);
      } else {
        // Criar nova lista
        await listService.create({
          board_id: Number(boardId),
          name: data.name,
          color: data.color,
        });
      }
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao salvar lista:", error);
      alert("Erro ao salvar lista");
    }
  };

  /**
   * Abre modal de confirmação para deletar lista
   */
  const handleDeleteListClick = (list: List) => {
    setDeletingList(list);
    setShowDeleteListModal(true);
  };

  /**
   * Deleta a lista
   */
  const handleDeleteList = async () => {
    if (!deletingList) return;

    try {
      await listService.delete(Number(boardId), deletingList.id);
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao deletar lista:", error);
      alert("Erro ao deletar lista");
    }
  };

  /**
   * Arquiva a lista (marca como deletada)
   */
  const handleArchiveList = async (list: List) => {
    try {
      await listService.update(Number(boardId), list.id, {
        is_deleted: true,
      });
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao arquivar lista:", error);
      alert("Erro ao arquivar lista");
    }
  };

  /**
   * Filtra cards baseado no termo de busca
   * Busca por título, descrição, nome do contato, email e empresa
   */
  const filterCards = (cardsToFilter: Card[]): Card[] => {
    if (!searchTerm.trim()) return cardsToFilter;

    const term = searchTerm.toLowerCase();
    return cardsToFilter.filter((card) => {
      // Buscar no título
      if (card.title?.toLowerCase().includes(term)) return true;

      // Buscar na descrição
      if (card.description?.toLowerCase().includes(term)) return true;

      // Buscar nas informações de contato
      if (card.contact_info?.name?.toLowerCase().includes(term)) return true;
      if (card.contact_info?.email?.toLowerCase().includes(term)) return true;
      if (card.contact_info?.company?.toLowerCase().includes(term)) return true;

      return false;
    });
  };

  /**
   * Abre modal para criar novo card em uma lista específica
   */
  const handleAddCard = (listId: number) => {
    setEditingCard(null);
    setSelectedListId(listId);
    setShowCardModal(true);
  };

  /**
   * Abre modal para editar card existente
   */
  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setSelectedListId(card.list_id);
    setShowCardModal(true);
  };

  /**
   * Salva card (criar ou editar)
   */
  const handleSaveCard = async (data: CardFormData) => {
    try {
      if (editingCard) {
        // Editar card existente
        await cardService.update(editingCard.id, data);
      } else {
        // Criar novo card
        await cardService.create(data);
      }
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao salvar card:", error);
      alert("Erro ao salvar card");
    }
  };

  /**
   * Handler quando inicia o drag de um card
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = Number(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      setActiveCard(card);
    }
  };

  /**
   * Handler durante o drag (para feedback visual em tempo real)
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = Number(active.id);
    const overId = over.id;

    // Se está sobre ele mesmo, não faz nada
    if (activeId === overId) return;

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Se está sobre outro card
    if (typeof overId === "number") {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;

      // Se mudou de lista, fazer o preview visual
      if (activeCard.list_id !== overCard.list_id) {
        setCards((currentCards) => {
          const activeIndex = currentCards.findIndex((c) => c.id === activeId);
          const overIndex = currentCards.findIndex((c) => c.id === overId);

          // Criar nova lista de cards com o card movido
          const newCards = [...currentCards];
          newCards[activeIndex] = { ...activeCard, list_id: overCard.list_id };

          return newCards;
        });
      }
      // Se é a mesma lista, reordenar
      else {
        setCards((currentCards) => {
          const activeIndex = currentCards.findIndex((c) => c.id === activeId);
          const overIndex = currentCards.findIndex((c) => c.id === overId);

          return arrayMove(currentCards, activeIndex, overIndex);
        });
      }
    }
    // Se está sobre uma lista vazia
    else if (typeof overId === "string" && overId.startsWith("droppable-list-")) {
      const targetListId = Number(overId.replace("droppable-list-", ""));

      if (activeCard.list_id !== targetListId) {
        setCards((currentCards) => {
          const activeIndex = currentCards.findIndex((c) => c.id === activeId);
          const newCards = [...currentCards];
          newCards[activeIndex] = { ...activeCard, list_id: targetListId };
          return newCards;
        });
      }
    }
  };

  /**
   * Calcula a nova posição fracionária para um card (estilo Trello)
   * Isso evita recalcular todas as posições quando move um card
   */
  const calculateNewPosition = (
    targetListId: number,
    overCardId: number | null
  ): number => {
    // Pegar todos os cards da lista de destino ordenados por posição
    const targetListCards = cards
      .filter((c) => c.list_id === targetListId)
      .sort((a, b) => a.position - b.position);

    // Se a lista está vazia, começar com 1000
    if (targetListCards.length === 0) {
      return 1000;
    }

    // Se não especificou card (dropou na lista vazia), colocar no final
    if (!overCardId) {
      const lastCard = targetListCards[targetListCards.length - 1];
      return lastCard.position + 1000;
    }

    // Encontrar o card sobre o qual dropou
    const overIndex = targetListCards.findIndex((c) => c.id === overCardId);

    if (overIndex === -1) {
      // Card não encontrado, colocar no final
      const lastCard = targetListCards[targetListCards.length - 1];
      return lastCard.position + 1000;
    }

    // Se está dropando no primeiro card
    if (overIndex === 0) {
      const firstCard = targetListCards[0];
      return firstCard.position / 2; // Metade da posição do primeiro
    }

    // Se está dropando entre dois cards, usar a média
    const prevCard = targetListCards[overIndex - 1];
    const nextCard = targetListCards[overIndex];
    return (prevCard.position + nextCard.position) / 2;
  };

  /**
   * Handler quando termina o drag de um card
   * SIMPLIFICADO: Por enquanto só move entre listas, reordenação virá depois
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);

    if (!over) return;

    const cardId = Number(active.id);
    const overId = over.id;

    // Pegar informações do card que está sendo movido
    const activeCard = cards.find((c) => c.id === cardId);
    if (!activeCard) return;

    // Se dropou sobre ele mesmo, não faz nada
    if (cardId === overId) return;

    // Determinar a lista de destino
    let targetListId: number;

    // Se dropou sobre outro card
    if (typeof overId === "number" && cards.find((c) => c.id === overId)) {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;
      targetListId = overCard.list_id;
    }
    // Se dropou sobre uma lista vazia (droppable-list-{id})
    else if (typeof overId === "string" && overId.startsWith("droppable-list-")) {
      targetListId = Number(overId.replace("droppable-list-", ""));
    } else {
      return;
    }

    // Por enquanto, só move entre listas diferentes
    // TODO: Implementar reordenação dentro da mesma lista
    if (activeCard.list_id === targetListId) {
      // Recarregar para reverter o preview visual
      await loadBoardData();
      return;
    }

    // Persistir a mudança no backend
    try {
      await cardService.move(cardId, {
        target_list_id: targetListId,
      });

      // Recarregar para sincronizar
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao mover card:", error);
      alert("Erro ao mover card");
      await loadBoardData();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando board...</p>
        </div>
      </div>
    );
  }

  // Board não encontrado
  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Board não encontrado</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Voltar para Boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header fixo */}
      <div className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Lado esquerdo: Voltar + Nome do Board */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Voltar para Boards"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>

            <div className="flex items-center gap-3">
              {/* Ícone e cor do board */}
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${board.color || "#3B82F6"}20`,
                }}
              >
                <div
                  className="w-6 h-6"
                  style={{ color: board.color || "#3B82F6" }}
                >
                  {/* TODO: Renderizar ícone dinamicamente */}
                  ⬜
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-gray-400">{board.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito: Ações */}
          <div className="flex items-center gap-3">
            {/* Barra de busca (expansível) */}
            {showSearchBar ? (
              <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2 animate-fadeIn">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cards..."
                  className="bg-transparent text-white placeholder-gray-400 outline-none w-64"
                  autoFocus
                  onBlur={() => {
                    // Fechar se não houver termo de busca
                    if (!searchTerm) setShowSearchBar(false);
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setShowSearchBar(false);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearchBar(true)}
                className={`p-2 hover:bg-gray-700/50 rounded-lg transition-colors ${
                  searchTerm ? "bg-blue-500/20 text-blue-400" : ""
                }`}
                title="Buscar cards"
              >
                <Search size={20} className={searchTerm ? "text-blue-400" : "text-gray-400"} />
              </button>
            )}

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 hover:bg-gray-700/50 rounded-lg transition-colors ${
                showFilters ? "bg-blue-500/20" : ""
              }`}
              title="Filtrar cards"
            >
              <Filter size={20} className={showFilters ? "text-blue-400" : "text-gray-400"} />
            </button>

            {/* Botão Nova Lista */}
            <button
              onClick={handleCreateList}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
              title="Adicionar nova lista"
            >
              <Plus size={20} />
              Nova Lista
            </button>

            {/* Menu do board */}
            <div className="relative">
              <button
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Opções do board"
              >
                <MoreVertical size={20} className="text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {showBoardMenu && (
                <>
                  {/* Overlay para fechar o menu */}
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowBoardMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[110] overflow-hidden">
                    <button
                      onClick={handleEditBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <Edit size={16} />
                      Editar Board
                    </button>

                    <button
                      onClick={handleDuplicateBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <Copy size={16} />
                      Duplicar Board
                    </button>

                    <button
                      onClick={handleArchiveBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <Archive size={16} />
                      Arquivar Board
                    </button>

                    <div className="border-t border-gray-700"></div>

                    <button
                      onClick={handleExportCards}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <Download size={16} />
                      Exportar Cards
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Filtros (expansível) */}
      {showFilters && (
        <div className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-300">Filtros:</span>

            {/* Filtro por lista */}
            <select
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as listas</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            {/* Filtro por valor */}
            <select
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Qualquer valor</option>
              <option value="0-1000">R$ 0 - R$ 1.000</option>
              <option value="1000-5000">R$ 1.000 - R$ 5.000</option>
              <option value="5000-10000">R$ 5.000 - R$ 10.000</option>
              <option value="10000+">R$ 10.000+</option>
            </select>

            {/* Filtro por data de vencimento */}
            <select
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Qualquer data</option>
              <option value="overdue">Atrasados</option>
              <option value="today">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mês</option>
            </select>

            {/* Limpar filtros */}
            <button
              onClick={() => setShowFilters(false)}
              className="ml-auto px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Área do Kanban com scroll horizontal */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full">
          {/* Renderizar listas */}
          {lists.length > 0 ? (
            lists.map((list) => {
              // Filtrar cards da lista e aplicar busca
              const listCards = cards.filter((card) => card.list_id === list.id);
              const filteredCards = filterCards(listCards);

              return (
                <KanbanList
                  key={list.id}
                  list={list}
                  cards={filteredCards}
                  onAddCard={() => handleAddCard(list.id)}
                  onEditList={() => handleEditList(list)}
                  onArchiveList={() => handleArchiveList(list)}
                  onDeleteList={() => handleDeleteListClick(list)}
                  onCardClick={(card) => handleEditCard(card)}
                />
              );
            })
          ) : (
            <div className="flex-shrink-0 w-80 bg-gray-800/30 backdrop-blur-sm rounded-xl p-4">
              <div className="text-center text-gray-400 py-8">
                <p className="text-lg font-medium mb-2">Nenhuma lista encontrada</p>
                <p className="text-sm mb-4">Crie sua primeira lista para começar</p>
                <button
                  onClick={handleCreateList}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} />
                  Nova Lista
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Overlay que mostra o card sendo arrastado */}
      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 scale-105 opacity-90">
            <KanbanCard card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modal de criar/editar lista */}
      <ListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onSave={handleSaveList}
        list={editingList}
        title={editingList ? "Editar Lista" : "Nova Lista"}
      />

      {/* Modal de confirmação de deleção */}
      <ConfirmModal
        isOpen={showDeleteListModal}
        onClose={() => setShowDeleteListModal(false)}
        onConfirm={handleDeleteList}
        title="Deletar Lista"
        message={`Tem certeza que deseja deletar a lista "${deletingList?.name}"? Todos os cards serão removidos permanentemente.`}
        confirmText="Deletar"
        isDanger={true}
      />

      {/* Modal de criar/editar card */}
      <CardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        onSave={handleSaveCard}
        card={editingCard}
        lists={lists}
        currentListId={selectedListId || lists[0]?.id || 0}
        title={editingCard ? "Editar Card" : "Novo Card"}
      />

      {/* Modal de editar board */}
      <BoardModal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        onSave={handleSaveBoard}
        board={board}
        title="Editar Board"
      />
    </DndContext>
  );
};

export default KanbanBoard;
