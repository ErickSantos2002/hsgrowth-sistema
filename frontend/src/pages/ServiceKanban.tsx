import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, MoreVertical, Edit, Trash2,
  Wrench, X, Loader2, GripVertical, ChevronLeft, ChevronRight,
  Grid3x3, Target, TrendingUp, Users, Briefcase, FolderKanban,
  Lightbulb, Rocket, Star, Heart, LucideIcon,
} from "lucide-react";
import serviceBoardService, {
  ServiceBoard,
  ServiceList,
  ServiceCard,
} from "../services/serviceBoardService";
import { showSuccess, showError } from "../utils/toast";
import { useConfirm } from "../contexts/ConfirmContext";
import { LoadingSpinner } from "../components/common";
import { useAuth } from "../hooks/useAuth";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  grid: Grid3x3, target: Target, "trending-up": TrendingUp, users: Users,
  briefcase: Briefcase, "folder-kanban": FolderKanban, lightbulb: Lightbulb,
  rocket: Rocket, star: Star, heart: Heart, wrench: Wrench,
};
const getIcon = (name: string): LucideIcon => ICON_MAP[name] || Grid3x3;

// ─── Modal de lista ───────────────────────────────────────────────────────────

interface ListModalProps {
  list?: ServiceList | null;
  boardId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const LIST_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6",
];

const ListModal: React.FC<ListModalProps> = ({ list, boardId, onClose, onSuccess }) => {
  const [name, setName] = useState(list?.name || "");
  const [color, setColor] = useState(list?.color || "#3B82F6");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (list) {
        await serviceBoardService.updateList(boardId, list.id, { name, color });
      } else {
        await serviceBoardService.createList(boardId, { board_id: boardId, name, color });
      }
      onSuccess();
    } catch { showError("Erro ao salvar lista"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          {list ? "Editar Lista" : "Nova Lista"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cor</label>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-slate-900 dark:border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal de card ────────────────────────────────────────────────────────────

interface CardModalProps {
  card?: ServiceCard | null;
  lists: ServiceList[];
  defaultListId: number;
  boardId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CardModal: React.FC<CardModalProps> = ({ card, lists, defaultListId, boardId, onClose, onSuccess }) => {
  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [listId, setListId] = useState(card?.list_id || defaultListId);
  const [contactName, setContactName] = useState(card?.contact_info?.name || "");
  const [contactPhone, setContactPhone] = useState(card?.contact_info?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const contact_info = (contactName || contactPhone)
        ? { name: contactName, phone: contactPhone }
        : undefined;

      if (card) {
        await serviceBoardService.updateCard(boardId, card.id, {
          title, description, list_id: listId, contact_info,
        });
      } else {
        await serviceBoardService.createCard(boardId, {
          list_id: listId, title, description, contact_info,
        });
      }
      onSuccess();
    } catch { showError("Erro ao salvar card"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          {card ? "Editar Card" : "Novo Card"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título *</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Lista</label>
            <select
              value={listId}
              onChange={(e) => setListId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome do contato</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Card do kanban ───────────────────────────────────────────────────────────

interface KanbanCardProps {
  card: ServiceCard;
  onEdit: () => void;
  onDelete: () => void;
  onMoveToList: (listId: number) => void;
  lists: ServiceList[];
  canManage: boolean;
}

const KanbanServiceCard: React.FC<KanbanCardProps> = ({ card, onEdit, onDelete, onMoveToList, lists, canManage }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div
      data-service-card
      className="group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 text-sm font-medium text-slate-900 dark:text-white leading-snug">
          {card.title}
        </h4>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <MoreVertical size={14} className="text-slate-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ top: "100%" }}>
              <button onClick={() => { setShowMenu(false); onEdit(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <Edit size={14} /> Editar
              </button>
              {lists.filter((l) => l.id !== card.list_id).map((l) => (
                <button key={l.id} onClick={() => { setShowMenu(false); onMoveToList(l.id); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronRight size={14} /> Mover para: {l.name}
                </button>
              ))}
              {canManage && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                  <button onClick={() => { setShowMenu(false); onDelete(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                    <Trash2 size={14} /> Deletar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {card.contact_info?.name && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.contact_info.name}</p>
      )}
      {card.contact_info?.phone && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{card.contact_info.phone}</p>
      )}
      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{card.description}</p>
      )}
    </div>
  );
};

// ─── Coluna do kanban ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  list: ServiceList;
  cards: ServiceCard[];
  allLists: ServiceList[];
  boardId: number;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onAddCard: () => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onEditCard: (card: ServiceCard) => void;
  onDeleteCard: (card: ServiceCard) => void;
  onMoveCard: (card: ServiceCard, listId: number) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list, cards, allLists, boardId, canManage, isFirst, isLast,
  onAddCard, onEditList, onDeleteList, onMoveLeft, onMoveRight,
  onEditCard, onDeleteCard, onMoveCard,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const colColor = list.color || "#8B5CF6";

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700/50 dark:bg-slate-800/30" style={{ maxHeight: "calc(100vh - 180px)" }}>
      {/* Header da coluna */}
      <div className="flex flex-shrink-0 items-center gap-2 rounded-t-xl px-3 py-3" style={{ borderBottom: `2px solid ${colColor}` }}>
        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: colColor }} />
        <h3 className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{list.name}</h3>
        <span className="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {cards.length}
        </span>

        {canManage && (
          <div className="relative flex items-center gap-1" ref={menuRef}>
            <button onClick={onMoveLeft} disabled={isFirst} title="Mover para esquerda"
              className="rounded p-1 text-slate-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-slate-700">
              <ChevronLeft size={14} />
            </button>
            <button onClick={onMoveRight} disabled={isLast} title="Mover para direita"
              className="rounded p-1 text-slate-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-slate-700">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700">
              <MoreVertical size={14} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <button onClick={() => { setShowMenu(false); onEditList(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Edit size={14} /> Editar
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <button onClick={() => { setShowMenu(false); onDeleteList(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                  <Trash2 size={14} /> Deletar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hidden">
        {cards.map((card) => (
          <KanbanServiceCard
            key={card.id}
            card={card}
            lists={allLists}
            canManage={canManage}
            onEdit={() => onEditCard(card)}
            onDelete={() => onDeleteCard(card)}
            onMoveToList={(lid) => onMoveCard(card, lid)}
          />
        ))}

        {/* Botão adicionar card */}
        <button
          onClick={onAddCard}
          className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-violet-400 hover:text-violet-400 dark:border-slate-700 dark:hover:border-violet-500"
        >
          <Plus size={14} />
          Adicionar card
        </button>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ServiceKanban: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const canManage = user?.role === "admin" || user?.role === "manager";

  const [board, setBoard] = useState<ServiceBoard | null>(null);
  const [lists, setLists] = useState<ServiceList[]>([]);
  const [cards, setCards] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // List modal
  const [showListModal, setShowListModal] = useState(false);
  const [editingList, setEditingList] = useState<ServiceList | null>(null);

  // Card modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<ServiceCard | null>(null);
  const [selectedListId, setSelectedListId] = useState<number>(0);

  // Scroll drag
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, scrollLeft: 0 });

  const numId = Number(boardId);

  const loadData = async () => {
    if (!numId) return;
    setLoading(true);
    try {
      const [boardData, listsData] = await Promise.all([
        serviceBoardService.getById(numId),
        serviceBoardService.getLists(numId),
      ]);
      setBoard(boardData);
      const sorted = [...listsData].sort((a, b) => a.position - b.position);
      setLists(sorted);
      setLoading(false);
      // Carrega cards em background
      const cardsData = await serviceBoardService.getCards(numId);
      setCards(cardsData.cards || []);
    } catch (err) {
      setLoading(false);
      showError("Erro ao carregar board de serviços");
      navigate("/servicos");
    }
  };

  const reloadCards = async () => {
    if (!numId) return;
    try {
      const data = await serviceBoardService.getCards(numId);
      setCards(data.cards || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadData(); }, [numId]);

  // Handlers de scroll drag
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-service-card]") || target.closest("button, input, select, textarea")) return;
    setIsDragging(true);
    dragRef.current = { startX: e.pageX, scrollLeft: boardScrollRef.current?.scrollLeft || 0 };
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !boardScrollRef.current) return;
    boardScrollRef.current.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.startX);
  };
  const onMouseUp = () => setIsDragging(false);

  // List ops
  const handleCreateList = () => { setEditingList(null); setShowListModal(true); };
  const handleEditList = (list: ServiceList) => { setEditingList(list); setShowListModal(true); };
  const handleDeleteList = async (list: ServiceList) => {
    const ok = await confirm({ title: "Deletar Lista", message: `Deletar "${list.name}"? Todos os cards serão removidos.`, confirmText: "Deletar", isDanger: true });
    if (!ok) return;
    try {
      await serviceBoardService.deleteList(numId, list.id);
      await loadData();
      showSuccess("Lista deletada!");
    } catch { showError("Erro ao deletar lista"); }
  };
  const handleMoveListLeft = async (list: ServiceList) => {
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx <= 0) return;
    try {
      await serviceBoardService.moveList(numId, list.id, lists[idx - 1].position);
      await loadData();
    } catch { showError("Erro ao mover lista"); }
  };
  const handleMoveListRight = async (list: ServiceList) => {
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= lists.length - 1) return;
    try {
      await serviceBoardService.moveList(numId, list.id, lists[idx + 1].position);
      await loadData();
    } catch { showError("Erro ao mover lista"); }
  };

  // Card ops
  const handleAddCard = (listId: number) => { setEditingCard(null); setSelectedListId(listId); setShowCardModal(true); };
  const handleEditCard = (card: ServiceCard) => { setEditingCard(card); setSelectedListId(card.list_id); setShowCardModal(true); };
  const handleDeleteCard = async (card: ServiceCard) => {
    const ok = await confirm({ title: "Deletar Card", message: `Deletar "${card.title}"?`, confirmText: "Deletar", isDanger: true });
    if (!ok) return;
    try {
      await serviceBoardService.deleteCard(numId, card.id);
      await reloadCards();
      showSuccess("Card deletado!");
    } catch { showError("Erro ao deletar card"); }
  };
  const handleMoveCard = async (card: ServiceCard, newListId: number) => {
    try {
      await serviceBoardService.moveCard(numId, card.id, newListId);
      await reloadCards();
    } catch { showError("Erro ao mover card"); }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando board de serviços...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-slate-500">Board não encontrado</p>
          <button onClick={() => navigate("/servicos")} className="rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const BoardIcon = getIcon(board.icon || "wrench");
  const boardColor = board.color || "#8B5CF6";

  const filteredCards = searchTerm.trim()
    ? cards.filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contact_info?.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
    : cards;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="relative z-20 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50 lg:z-50">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {/* Esquerda */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/servicos")}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
              title="Voltar para Boards de Serviços"
            >
              <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${boardColor}20` }}>
                <BoardIcon size={24} style={{ color: boardColor }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{board.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Direita */}
          <div className="flex items-center gap-2">
            {showSearch ? (
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800/50">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cards..."
                  autoFocus
                  className="w-48 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-white"
                  onBlur={() => { if (!searchTerm) setShowSearch(false); }}
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(""); setShowSearch(false); }}>
                    <X size={16} className="text-slate-400" />
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50">
                <Search size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            )}

            {canManage && (
              <button
                onClick={handleCreateList}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg hover:from-violet-600 hover:to-purple-600 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
              >
                <Plus size={20} />
                <span className="hidden sm:ml-2 sm:inline">Nova Lista</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Área kanban */}
      <div
        ref={boardScrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={`scrollbar-hidden flex-1 overflow-x-auto overflow-y-hidden p-6 pb-20 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      >
        <div className="flex h-full gap-4">
          {lists.length > 0 ? (
            lists.map((list, idx) => {
              const listCards = filteredCards
                .filter((c) => c.list_id === list.id && !c.is_deleted)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

              return (
                <KanbanColumn
                  key={list.id}
                  list={list}
                  cards={listCards}
                  allLists={lists}
                  boardId={numId}
                  canManage={canManage}
                  isFirst={idx === 0}
                  isLast={idx === lists.length - 1}
                  onAddCard={() => handleAddCard(list.id)}
                  onEditList={() => handleEditList(list)}
                  onDeleteList={() => handleDeleteList(list)}
                  onMoveLeft={() => handleMoveListLeft(list)}
                  onMoveRight={() => handleMoveListRight(list)}
                  onEditCard={handleEditCard}
                  onDeleteCard={handleDeleteCard}
                  onMoveCard={handleMoveCard}
                />
              );
            })
          ) : (
            <div className="flex w-80 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-slate-700/50 dark:bg-slate-800/30">
              <p className="mb-2 text-lg font-medium text-slate-500">Nenhuma lista encontrada</p>
              {canManage && (
                <button onClick={handleCreateList} className="mt-4 flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600">
                  <Plus size={16} /> Nova Lista
                </button>
              )}
            </div>
          )}
          <div className="w-1 flex-shrink-0" aria-hidden />
        </div>
      </div>

      {/* Modal de lista */}
      {showListModal && (
        <ListModal
          list={editingList}
          boardId={numId}
          onClose={() => setShowListModal(false)}
          onSuccess={() => { setShowListModal(false); loadData(); }}
        />
      )}

      {/* Modal de card */}
      {showCardModal && (
        <CardModal
          card={editingCard}
          lists={lists}
          defaultListId={selectedListId || lists[0]?.id || 0}
          boardId={numId}
          onClose={() => setShowCardModal(false)}
          onSuccess={() => { setShowCardModal(false); reloadCards(); }}
        />
      )}
    </div>
  );
};

export default ServiceKanban;
