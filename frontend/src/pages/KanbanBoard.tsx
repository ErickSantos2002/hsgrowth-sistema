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
import boardService from "../services/boardService";
import listService from "../services/listService";
import cardService from "../services/cardService";
import userService from "../services/userService";
import { Board, List, Card, User } from "../types";
import { COLORS } from "../constants/colors";
import KanbanList from "../components/kanban/KanbanList";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import { LoadingSpinner } from "../components/common";
import KanbanCard from "../components/kanban/KanbanCard";
import ListModal from "../components/kanban/ListModal";
import ConfirmModal from "../components/kanban/ConfirmModal";
import CardModal, { CardFormData } from "../components/kanban/CardModal";
import BoardModal from "../components/kanban/BoardModal";
import { useAuth } from "../context/AuthContext";

const KanbanBoard: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Pegar usuário logado
  const { confirm } = useConfirm();

  // Permissões: Apenas Admin e Manager podem criar listas
  const canCreateList = user?.role === "admin" || user?.role === "manager";

  // Estados
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);

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
  const [assignedToFilter, setAssignedToFilter] = useState(""); // Filtro de vendedor
  const [sdrFilter, setSdrFilter] = useState(""); // Filtro de SDR
  const [statusFilter, setStatusFilter] = useState("open"); // Filtro de status (padrão: apenas abertos)
  const [availableUsers, setAvailableUsers] = useState<User[]>([]); // Lista de usuários
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const dragStateRef = useRef({ startX: 0, scrollLeft: 0 });


  /**
   * Carrega os dados do board ao montar o componente
   */
  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId]);

  /**
   * Carrega lista de usuários ativos e aplica lógica de permissão por role
   */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await userService.listActive();
        setAvailableUsers(users);

        // Se o usuário logado é vendedor (salesperson), trava o filtro nele
        if (user && user.role === "salesperson") {
          setAssignedToFilter(String(user.id));
        }

        // Se o usuário logado é SDR, trava o filtro nele
        if (user && user.role === "sdr") {
          setSdrFilter(String(user.id));
        }
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };

    loadUsers();
  }, [user]);

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
      showError("Erro ao carregar board");
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
      showError("Erro ao salvar board");
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
      showSuccess("Board duplicado com sucesso!");
      navigate("/boards");
    } catch (error) {
      console.error("Erro ao duplicar board:", error);
      showError("Erro ao duplicar board");
    }
  };

  /**
   * Arquiva o board
   */
  const handleArchiveBoard = async () => {
    setShowBoardMenu(false);
    if (!board) return;

    const confirmed = await confirm({
      title: "Arquivar Board",
      message: `Tem certeza que deseja arquivar o board "${board.name}"? Ele ficará disponível na seção de arquivados.`,
      confirmText: "Arquivar",
      isDanger: false,
    });

    if (!confirmed) return;

    try {
      await boardService.update(board.id, { is_deleted: true });
      showSuccess("Board arquivado com sucesso!");
      navigate("/boards");
    } catch (error) {
      console.error("Erro ao arquivar board:", error);
      showError("Erro ao arquivar board");
    }
  };

  /**
   * Exporta os cards do board
   */
  const handleExportCards = () => {
    setShowBoardMenu(false);
    // TODO: Implementar exportação
    showWarning("Exportar cards - Funcionalidade em desenvolvimento");
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
      showError("Erro ao salvar lista");
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
      showError("Erro ao deletar lista");
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
      showError("Erro ao arquivar lista");
    }
  };

  /**
   * Move a lista para a esquerda (diminui posição)
   */
  const handleMoveListLeft = async (list: List) => {
    try {
      // Encontrar a posição atual da lista no array ordenado
      const currentIndex = lists.findIndex((l) => l.id === list.id);

      if (currentIndex <= 0) {
        // Já é a primeira lista, não pode ir mais para esquerda
        return;
      }

      // Pegar a lista anterior (à esquerda) e usar a position dela
      const targetList = lists[currentIndex - 1];
      const newPosition = targetList.position;

      await listService.move(Number(boardId), list.id, newPosition);
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao mover lista para esquerda:", error);
      showError("Erro ao mover lista");
    }
  };

  /**
   * Move a lista para a direita (aumenta posição)
   */
  const handleMoveListRight = async (list: List) => {
    try {
      // Encontrar a posição atual da lista no array ordenado
      const currentIndex = lists.findIndex((l) => l.id === list.id);

      if (currentIndex >= lists.length - 1) {
        // Já é a última lista, não pode ir mais para direita
        return;
      }

      // Pegar a lista seguinte (à direita) e usar a position dela
      const targetList = lists[currentIndex + 1];
      const newPosition = targetList.position;

      await listService.move(Number(boardId), list.id, newPosition);
      await loadBoardData();
    } catch (error) {
      console.error("Erro ao mover lista para direita:", error);
      showError("Erro ao mover lista");
    }
  };

  /**
   * Filtra cards baseado em todos os filtros ativos
   * - Busca por termo (título, descrição, contato)
   * - Filtro por lista
   * - Filtro por vendedor (assigned_to_id)
   * - Filtro por faixa de valor
   * - Filtro por data de vencimento
   */
  const filterCards = (cardsToFilter: Card[]): Card[] => {
    return cardsToFilter.filter((card) => {
      // Filtro de busca por termo
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          card.title?.toLowerCase().includes(term) ||
          card.description?.toLowerCase().includes(term) ||
          card.contact_info?.name?.toLowerCase().includes(term) ||
          card.contact_info?.email?.toLowerCase().includes(term) ||
          card.contact_info?.company?.toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      // Filtro por lista (já é aplicado antes, mas mantém aqui por segurança)
      if (listFilter && String(card.list_id) !== listFilter) {
        return false;
      }

      // Filtro por vendedor (assigned_to_id)
      if (assignedToFilter) {
        const filterId = Number(assignedToFilter);
        if (card.assigned_to_id !== filterId) {
          return false;
        }
      }

      // Filtro por SDR (sdr_id)
      if (sdrFilter) {
        const filterId = Number(sdrFilter);
        if ((card as any).sdr_id !== filterId) {
          return false;
        }
      }

      // Filtro por status (ganho/perdido/aberto)
      if (statusFilter) {
        const cardIsWon = card.is_won === true;
        const cardIsLost = (card as any).is_lost === true; // Backend retorna is_lost separado
        const cardIsOpen = !cardIsWon && !cardIsLost;

        switch (statusFilter) {
          case "open":
            if (!cardIsOpen) return false;
            break;
          case "won":
            if (!cardIsWon) return false;
            break;
          case "lost":
            if (!cardIsLost) return false;
            break;
          case "all":
            // Mostra todos
            break;
        }
      }

      // Filtro por faixa de valor
      if (valueFilter && card.value !== null) {
        const value = card.value;
        let matches = false;

        switch (valueFilter) {
          case "0-1000":
            matches = value >= 0 && value <= 1000;
            break;
          case "1000-5000":
            matches = value > 1000 && value <= 5000;
            break;
          case "5000-10000":
            matches = value > 5000 && value <= 10000;
            break;
          case "10000+":
            matches = value > 10000;
            break;
        }

        if (!matches) return false;
      }

      // Filtro por data de criação
      if (dueDateFilter) {
        // Se o card não tem created_at por algum motivo, exclui do resultado
        if (!card.created_at) return false;

        const createdDate = new Date(card.created_at);

        // Se a data é inválida, exclui do resultado
        if (isNaN(createdDate.getTime())) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let matches = false;

        switch (dueDateFilter) {
          case "overdue": {
            // Antes desta semana: criado antes do início da semana atual (segunda-feira)
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay();
            startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
            matches = createdDate < startOfWeek;
            break;
          }
          case "today": {
            // Hoje: criado hoje
            const createdOnly = new Date(createdDate);
            createdOnly.setHours(0, 0, 0, 0);
            matches = createdOnly.getTime() === today.getTime();
            break;
          }
          case "week": {
            // Esta semana: criado desde segunda-feira até hoje
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay();
            startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
            startOfWeek.setHours(0, 0, 0, 0);
            matches = createdDate >= startOfWeek && createdDate <= new Date();
            break;
          }
          case "month":
            // Este mês: criado no mês atual
            matches =
              createdDate.getMonth() === today.getMonth() &&
              createdDate.getFullYear() === today.getFullYear();
            break;
        }

        if (!matches) return false;
      }

      return true;
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
        assigned_to_id: data.assigned_to_id || undefined,
        sdr_id: data.sdr_id || undefined,
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
      showError("Erro ao salvar card");
    }
  };

  /**
   * Navega para a página de detalhes do card
   */
  const handleViewCard = (card: Card) => {
    navigate(`/cards/${card.id}`);
  };

  /**
   * Retorna a prioridade de ordenação baseada no status das atividades pendentes.
   * Quanto menor o número, mais ao topo o card aparece.
   * Ordem: vencidas → hoje → futuras → sem atividades
   */
  const getActivitySortPriority = (status: string | null | undefined): number => {
    if (status === "overdue") return 0;
    if (status === "today") return 1;
    if (status === "future") return 2;
    return 3; // sem atividades
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando board...</p>
        </div>
      </div>
    );
  }

  // Board não encontrado
  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg text-slate-500 dark:text-slate-400">Board não encontrado</p>
          <button
            onClick={handleBack}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Voltar para Boards
          </button>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(board.icon || "grid");

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header fixo */}
      <div className="relative z-20 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50 lg:z-50">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {/* Lado esquerdo: Voltar + Nome do Board */}
          <div className="flex w-full items-center gap-4 sm:w-auto">
            <button
              onClick={handleBack}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
              title="Voltar para Boards"
            >
              <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
            </button>

            <div className="flex items-center gap-3">
              {/* Ícone e cor do board */}
              <div
                className="rounded-lg p-2"
                style={{
                  backgroundColor: `${board.color || COLORS.board.blue}20`,
                }}
              >
                <IconComponent
                  size={24}
                  style={{ color: board.color || COLORS.board.blue }}
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{board.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito: Ações */}
          <div className="mt-1 flex w-full items-center justify-end gap-2 sm:mt-0 sm:w-auto sm:gap-3">
            {/* Barra de busca (expansível) */}
            {showSearchBar ? (
              <div className="animate-fadeIn flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800/50 sm:w-auto">
                <Search size={18} className="text-slate-400 dark:text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cards..."
                  className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-white sm:w-64"
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
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearchBar(true)}
                className={`rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${
                  searchTerm ? "bg-blue-500/20 text-blue-400" : ""
                }`}
                title="Buscar cards"
              >
                <Search size={20} className={searchTerm ? "text-blue-400" : "text-slate-500 dark:text-slate-400"} />
              </button>
            )}

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${
                showFilters ? "bg-blue-500/20" : ""
              }`}
              title="Filtrar cards"
            >
              <Filter size={20} className={showFilters ? "text-blue-400" : "text-slate-500 dark:text-slate-400"} />
            </button>

            {/* Botão Nova Lista - Apenas Admin e Manager */}
            {canCreateList && (
              <button
                onClick={handleCreateList}
                className="flex h-10 w-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-0 py-0 text-white shadow-lg transition-all hover:from-green-600 hover:to-emerald-600 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                title="Adicionar nova lista"
                aria-label="Adicionar nova lista"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nova Lista</span>
              </button>
            )}

            {/* Menu do board */}
            <div className="relative">
              <button
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
                title="Opções do board"
              >
                <MoreVertical size={20} className="text-slate-500 dark:text-slate-400" />
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
                  <div className="absolute right-0 z-[110] mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
                    <button
                      onClick={handleEditBoard}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Edit size={16} />
                      Editar Board
                    </button>

                    <button
                      onClick={handleDuplicateBoard}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy size={16} />
                      Duplicar Board
                    </button>

                    <button
                      onClick={handleArchiveBoard}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Archive size={16} />
                      Arquivar Board
                    </button>

                    <div className="border-t border-gray-200 dark:border-slate-700/50"></div>

                    <button
                      onClick={handleExportCards}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
        <div className="relative z-10 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 dark:border-slate-700/50 dark:bg-slate-900/50 lg:z-40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtros:</span>

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

            {/* Filtro por status (ganho/perdido/aberto) */}
            <div className="w-full sm:w-auto sm:min-w-[160px]">
              <SelectMenu
                value={statusFilter}
                options={[
                  { value: "open", label: "Apenas Abertos" },
                  { value: "all", label: "Todos" },
                  { value: "won", label: "Apenas Ganhos" },
                  { value: "lost", label: "Apenas Perdidos" },
                ]}
                onChange={setStatusFilter}
              />
            </div>

            {/* Filtro por vendedor (responsável) */}
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <SelectMenu
                value={assignedToFilter}
                options={[
                  { value: "", label: "Todos os vendedores" },
                  ...availableUsers
                    .filter((u) => u.role !== "sdr") // Exclui SDRs da lista de vendedores
                    .map((u) => ({
                      value: String(u.id),
                      label: u.name,
                    })),
                ]}
                onChange={setAssignedToFilter}
                disabled={user?.role === "salesperson"} // Trava se for vendedor
              />
            </div>

            {/* Filtro por SDR */}
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <SelectMenu
                value={sdrFilter}
                options={[
                  { value: "", label: "Todos os SDRs" },
                  ...availableUsers
                    .filter((u) => u.role === "sdr") // Apenas SDRs
                    .map((u) => ({
                      value: String(u.id),
                      label: u.name,
                    })),
                ]}
                onChange={setSdrFilter}
                disabled={user?.role === "sdr"} // Trava se for SDR
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

            {/* Filtro por data de criação */}
            <div className="w-full sm:w-auto sm:min-w-[170px]">
              <SelectMenu
                value={dueDateFilter}
                options={[
                  { value: "", label: "Qualquer data" },
                  { value: "overdue", label: "Antes desta semana" },
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
              className="px-3 py-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:ml-auto"
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
        className={`scrollbar-hidden flex-1 overflow-x-auto overflow-y-hidden p-6 pb-20 ${
          isDraggingBoard ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        <div className="flex h-[calc(100%)] gap-4">
          {/* Renderizar listas */}
          {lists.length > 0 ? (
            lists.map((list, index) => {
              // Filtrar cards da lista, aplicar busca e ordenar por status de atividade
              // Ordem: vencidas → hoje → futuras → sem atividades
              const listCards = cards.filter((card) => card.list_id === list.id);
              const filteredCards = filterCards(listCards).sort(
                (a, b) =>
                  getActivitySortPriority((a as any).pending_tasks_status) -
                  getActivitySortPriority((b as any).pending_tasks_status)
              );

              // Verificar se é primeira ou última lista
              const isFirstList = index === 0;
              const isLastList = index === lists.length - 1;

              // Regra de criação de cards:
              // Admin e Manager podem criar em qualquer lista.
              // Demais roles só podem criar na primeira lista do board de Prospecção (id=6).
              const canAddCardToList =
                canCreateList || (board?.id === 6 && isFirstList);

              return (
                <KanbanList
                  key={list.id}
                  list={list}
                  cards={filteredCards}
                  onAddCard={canAddCardToList ? () => handleAddCard(list.id) : undefined}
                  onEditList={() => handleEditList(list)}
                  onArchiveList={() => handleArchiveList(list)}
                  onDeleteList={() => handleDeleteListClick(list)}
                  onCardClick={(card) => handleViewCard(card)}
                  onMoveLeft={() => handleMoveListLeft(list)}
                  onMoveRight={() => handleMoveListRight(list)}
                  isFirstList={isFirstList}
                  isLastList={isLastList}
                  canManageLists={canCreateList}
                />
              );
            })
          ) : (
            <div className="w-80 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="mb-2 text-lg font-medium">Nenhuma lista encontrada</p>
                {canCreateList ? (
                  <>
                    <p className="mb-4 text-sm">Crie sua primeira lista para começar</p>
                    <button
                      onClick={handleCreateList}
                      className="mx-auto flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
                    >
                      <Plus size={16} />
                      Nova Lista
                    </button>
                  </>
                ) : (
                  <p className="mb-4 text-sm">Entre em contato com o administrador para criar listas</p>
                )}
              </div>
            </div>
          )}
          <div className="w-1 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>

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
  disabled?: boolean; // Nova prop para desabilitar o select
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

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
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

export default KanbanBoard;
