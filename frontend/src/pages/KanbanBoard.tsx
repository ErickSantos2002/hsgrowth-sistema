import React, { useRef, useState, useEffect } from "react";
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
  X,
  Grid3x3,
  Target,
  TrendingUp,
  Users,
  Briefcase,
  FolderKanban,
  Lightbulb,
  Rocket,
  Star,
  Heart,
  ChevronDown,
  LucideIcon,
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
  const [listFilter, setListFilter] = useState("");
  const [valueFilter, setValueFilter] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const dragStateRef = useRef({ startX: 0, scrollLeft: 0 });

  // Ref para rastrear requisições pendentes de movimento
  const pendingMovesRef = useRef<Set<number>>(new Set());

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

  const handleBoardMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!boardScrollRef.current) return;
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("[data-kanban-card]")) return;
    if (target.closest("button, a, input, textarea, select")) return;

    setIsDraggingBoard(true);
    dragStateRef.current = {
      startX: event.pageX,
      scrollLeft: boardScrollRef.current.scrollLeft,
    };
  };

  const handleBoardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!boardScrollRef.current || !isDraggingBoard) return;
    const delta = event.pageX - dragStateRef.current.startX;
    boardScrollRef.current.scrollLeft = dragStateRef.current.scrollLeft - delta;
  };

  const handleBoardMouseUp = () => {
    setIsDraggingBoard(false);
  };

  const getIconComponent = (iconName: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      grid: Grid3x3,
      target: Target,
      "trending-up": TrendingUp,
      users: Users,
      briefcase: Briefcase,
      "folder-kanban": FolderKanban,
      lightbulb: Lightbulb,
      rocket: Rocket,
      star: Star,
      heart: Heart,
      "ƒªo": Grid3x3,
      "ÐY\"S": TrendingUp,
      "ÐYZî": Target,
      "ÐY'¬": Briefcase,
      "ÐYs?": Rocket,
      "ÐY\"^": TrendingUp,
      "ÐY'­": Lightbulb,
      "ÐY\"¾": Rocket,
      "ƒð?": Star,
      "ƒ?Ï‹÷?": Heart,
    };

    return iconMap[iconName] || Grid3x3;
  };

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

      // Carregar cards do board e ordenar por position
      // IMPORTANTE: all=true retorna TODOS os cards sem limite
      // minimal=true retorna apenas campos essenciais (otimizado ~60% menor)
      const cardsResponse = await cardService.list({
        board_id: Number(boardId),
        all: true,      // ✅ Sem limite de paginação
        minimal: true   // ✅ Apenas campos essenciais para Kanban
      });
      const sortedCards = (cardsResponse.cards || []).sort((a, b) => (a.position || 0) - (b.position || 0));
      setCards(sortedCards);
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
      // Preparar dados para o backend
      const cardData: any = {
        list_id: data.list_id,
        title: data.title,
        description: data.description || undefined,
        value: data.value || undefined,
        assigned_to_id: data.assigned_to_id || undefined,
        contact_info: data.contact_info || undefined,
      };

      // Converter due_date de YYYY-MM-DD para datetime ISO
      if (data.due_date) {
        // Adicionar horário padrão (meio-dia) se vier apenas data
        const dateStr = data.due_date.includes('T')
          ? data.due_date
          : `${data.due_date}T12:00:00`;
        cardData.due_date = dateStr;
      }

      if (editingCard) {
        // Editar card existente
        await cardService.update(editingCard.id, cardData);
      } else {
        // Criar novo card
        await cardService.create(cardData);
      }
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao salvar card:", error);
      alert("Erro ao salvar card");
    }
  };

  /**
   * Navega para a página de detalhes do card
   */
  const handleViewCard = (card: Card) => {
    navigate(`/cards/${card.id}`);
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
   * Necessário para preview entre listas diferentes
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

      // IMPORTANTE: Só fazer preview se mudou de lista
      // Se é a mesma lista, deixa o SortableContext lidar (mais fluido)
      if (activeCard.list_id !== overCard.list_id) {
        setCards((currentCards) => {
          const activeIndex = currentCards.findIndex((c) => c.id === activeId);
          const overIndex = currentCards.findIndex((c) => c.id === overId);

          // Criar nova array sem o card ativo
          const withoutActive = currentCards.filter((c) => c.id !== activeId);

          // Inserir o card ativo na posição do overCard
          const result = [...withoutActive];
          result.splice(overIndex, 0, { ...activeCard, list_id: overCard.list_id });

          return result;
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

    const activeId = Number(active.id);
    const overId = over.id;

    // Pegar informações do card que está sendo movido
    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Se dropou sobre ele mesmo, não faz nada
    if (activeId === overId) return;

    // Se já tem uma requisição pendente para este card, aguarda (previne race condition)
    if (pendingMovesRef.current.has(activeId)) {
      console.warn(`Card ${activeId} já tem movimento pendente. Aguarde...`);
      return;
    }

    // Determinar a lista de destino e posição
    let targetListId: number;
    let targetPosition: number | undefined;

    // Se dropou sobre outro card
    if (typeof overId === "number") {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;

      targetListId = overCard.list_id;

      // Se está na mesma lista
      if (activeCard.list_id === targetListId) {
        // Calcular posição: pegar todos os cards da lista (incluindo o ativo)
        const targetListCards = cards
          .filter((c) => c.list_id === targetListId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        const activeIndex = targetListCards.findIndex((c) => c.id === activeId);
        const overIndex = targetListCards.findIndex((c) => c.id === overId);

        // Se moveu dentro da mesma lista
        if (activeIndex !== overIndex) {
          // Reordenar localmente
          const reordered = arrayMove(targetListCards, activeIndex, overIndex);

          // Atualizar state local otimisticamente
          setCards((currentCards) => {
            const otherCards = currentCards.filter((c) => c.list_id !== targetListId);
            return [...otherCards, ...reordered];
          });

          // Calcular nova posição (índice do card no destino)
          targetPosition = overIndex;
        } else {
          // Mesma posição, não faz nada
          return;
        }
      } else {
        // Movendo para outra lista: pegar cards EXCLUINDO o ativo
        const targetListCards = cards
          .filter((c) => c.list_id === targetListId && c.id !== activeId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        // Encontrar a posição do overCard na lista de destino
        const overIndex = targetListCards.findIndex((c) => c.id === overId);

        // Inserir na posição do overCard
        targetPosition = overIndex >= 0 ? overIndex : 0;

        // Atualizar state local otimisticamente
        setCards((currentCards) => {
          const withoutActive = currentCards.filter((c) => c.id !== activeId);
          const result = [...withoutActive];
          const insertIndex = result.findIndex((c) => c.id === overId);

          if (insertIndex >= 0) {
            result.splice(insertIndex, 0, { ...activeCard, list_id: targetListId });
          } else {
            result.push({ ...activeCard, list_id: targetListId });
          }

          return result;
        });
      }
    }
    // Se dropou sobre uma lista vazia (droppable-list-{id})
    else if (typeof overId === "string" && overId.startsWith("droppable-list-")) {
      targetListId = Number(overId.replace("droppable-list-", ""));
      // Posição 0 (primeira posição na lista vazia)
      targetPosition = 0;

      // Atualizar state local otimisticamente
      setCards((currentCards) => {
        const withoutActive = currentCards.filter((c) => c.id !== activeId);
        return [...withoutActive, { ...activeCard, list_id: targetListId }];
      });
    } else {
      return;
    }

    // Persistir a mudança no backend (não bloqueante)
    // Adiciona à lista de requisições pendentes
    pendingMovesRef.current.add(activeId);

    try {
      const movedCard = await cardService.move(activeId, {
        target_list_id: targetListId,
        position: targetPosition,
      });

      // Remove da lista de pendentes
      pendingMovesRef.current.delete(activeId);

      // Atualizar apenas o card movido com dados do backend
      setCards((currentCards) =>
        currentCards.map((c) =>
          c.id === activeId
            ? { ...c, ...movedCard, list_id: targetListId }
            : c
        )
      );

      console.log(`Card ${activeId} movido com sucesso. Pendentes: ${pendingMovesRef.current.size}`);
    } catch (error) {
      console.error("Erro ao mover card:", error);

      // Remove da lista de pendentes mesmo em erro
      pendingMovesRef.current.delete(activeId);

      // Reverter mudança localmente (voltar card para posição original)
      setCards((currentCards) => {
        const revertedCards = currentCards.map((c) =>
          c.id === activeId ? { ...activeCard } : c
        );
        return revertedCards.sort((a, b) => (a.position || 0) - (b.position || 0));
      });

      alert("Erro ao mover card. A mudança foi revertida.");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando board...</p>
        </div>
      </div>
    );
  }

  // Board não encontrado
  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">Board não encontrado</p>
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

  const IconComponent = getIconComponent(board.icon || "grid");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header fixo */}
      <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 relative z-20 lg:z-50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          {/* Lado esquerdo: Voltar + Nome do Board */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Voltar para Boards"
            >
              <ArrowLeft size={20} className="text-slate-400" />
            </button>

            <div className="flex items-center gap-3">
              {/* Ícone e cor do board */}
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${board.color || "#3B82F6"}20`,
                }}
              >
                <IconComponent
                  size={24}
                  style={{ color: board.color || "#3B82F6" }}
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-slate-400">{board.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito: Ações */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end mt-1 sm:mt-0">
            {/* Barra de busca (expansível) */}
            {showSearchBar ? (
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 animate-fadeIn w-full sm:w-auto">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cards..."
                  className="bg-transparent text-white placeholder-slate-400 outline-none flex-1 min-w-0 sm:w-64"
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
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearchBar(true)}
                className={`p-2 hover:bg-slate-800/50 rounded-lg transition-colors ${
                  searchTerm ? "bg-blue-500/20 text-blue-400" : ""
                }`}
                title="Buscar cards"
              >
                <Search size={20} className={searchTerm ? "text-blue-400" : "text-slate-400"} />
              </button>
            )}

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 hover:bg-slate-800/50 rounded-lg transition-colors ${
                showFilters ? "bg-blue-500/20" : ""
              }`}
              title="Filtrar cards"
            >
              <Filter size={20} className={showFilters ? "text-blue-400" : "text-slate-400"} />
            </button>

            {/* Botão Nova Lista */}
            <button
              onClick={handleCreateList}
              className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto px-0 sm:px-4 py-0 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
              title="Adicionar nova lista"
              aria-label="Adicionar nova lista"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nova Lista</span>
            </button>

            {/* Menu do board */}
            <div className="relative">
              <button
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                title="Opções do board"
              >
                <MoreVertical size={20} className="text-slate-400" />
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
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/50 rounded-lg shadow-xl z-[110] overflow-hidden">
                    <button
                      onClick={handleEditBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Edit size={16} />
                      Editar Board
                    </button>

                    <button
                      onClick={handleDuplicateBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Copy size={16} />
                      Duplicar Board
                    </button>

                    <button
                      onClick={handleArchiveBoard}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Archive size={16} />
                      Arquivar Board
                    </button>

                    <div className="border-t border-slate-700/50"></div>

                    <button
                      onClick={handleExportCards}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
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
        <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-3 relative z-10 lg:z-40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-slate-300">Filtros:</span>

            {/* Filtro por lista */}
            <div className="w-full sm:w-auto sm:min-w-[190px]">
              <SelectMenu
                value={listFilter}
                options={[
                  { value: "", label: "Todas as listas" },
                  ...lists.map((list) => ({
                    value: String(list.id),
                    label: list.name,
                  })),
                ]}
                onChange={setListFilter}
              />
            </div>

            {/* Filtro por valor */}
            <div className="w-full sm:w-auto sm:min-w-[180px]">
              <SelectMenu
                value={valueFilter}
                options={[
                  { value: "", label: "Qualquer valor" },
                  { value: "0-1000", label: "R$ 0 - R$ 1.000" },
                  { value: "1000-5000", label: "R$ 1.000 - R$ 5.000" },
                  { value: "5000-10000", label: "R$ 5.000 - R$ 10.000" },
                  { value: "10000+", label: "R$ 10.000+" },
                ]}
                onChange={setValueFilter}
              />
            </div>

            {/* Filtro por data de vencimento */}
            <div className="w-full sm:w-auto sm:min-w-[170px]">
              <SelectMenu
                value={dueDateFilter}
                options={[
                  { value: "", label: "Qualquer data" },
                  { value: "overdue", label: "Atrasados" },
                  { value: "today", label: "Hoje" },
                  { value: "week", label: "Esta semana" },
                  { value: "month", label: "Este mês" },
                ]}
                onChange={setDueDateFilter}
              />
            </div>

            {/* Limpar filtros */}
            <button
              onClick={() => setShowFilters(false)}
              className="sm:ml-auto px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Área do Kanban com scroll horizontal */}
      <div
        ref={boardScrollRef}
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
        onMouseLeave={handleBoardMouseUp}
        className={`flex-1 overflow-x-auto overflow-y-hidden p-6 pb-20 scrollbar-hidden ${
          isDraggingBoard ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        <div className="flex gap-4 h-[calc(100%)]">
          {/* Renderizar listas */}
          {lists.length > 0 ? (
            lists.map((list) => {
              // Filtrar cards da lista, ordenar por position e aplicar busca
              const listCards = cards
                .filter((card) => card.list_id === list.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
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
                  onCardClick={(card) => handleViewCard(card)}
                />
              );
            })
          ) : (
            <div className="flex-shrink-0 w-80 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="text-center text-slate-400 py-8">
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
          <div className="flex-shrink-0 w-1" aria-hidden="true" />
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
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
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

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
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

export default KanbanBoard;
