import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Zap,
  Play,
  Pause,
  Edit,
  Trash2,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  Shield,
  Workflow,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import automationService, { Automation } from "../services/automationService";
import boardService from "../services/boardService";
import AutomationRoundRobinForm from "../components/AutomationRoundRobinForm";

interface Board {
  id: number;
  name: string;
}

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showRoundRobinForm, setShowRoundRobinForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  // Verifica se o usuário é admin ou manager
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carrega boards reais
      const boardsResponse = await boardService.list();
      const boardsList = boardsResponse.boards || [];
      setBoards(boardsList);

      // Carrega automações de todos os boards
      const allAutomations: Automation[] = [];

      for (const board of boardsList) {
        try {
          const response = await automationService.list(board.id);
          const boardAutomations = response.automations.map((auto: any) => ({
            ...auto,
            board_name: board.name,
            nodes: [],
            edges: [],
            created_by: 1,
            execution_count: auto.execution_count || 0,
            success_count: auto.execution_count - auto.failure_count || 0,
            error_count: auto.failure_count || 0,
          }));
          allAutomations.push(...boardAutomations);
        } catch (err) {
          console.error(`Erro ao carregar automações do board ${board.id}:`, err);
        }
      }

      setAutomations(allAutomations);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await automationService.update(id, { is_active: !currentStatus });

      // Atualiza localmente
      setAutomations((prev) =>
        prev.map((auto) =>
          auto.id === id ? { ...auto, is_active: !currentStatus } : auto
        )
      );
    } catch (error) {
      console.error("Erro ao ativar/desativar automação:", error);
      alert("Erro ao alterar status da automação");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar esta automação?")) return;

    try {
      await automationService.delete(id);
      setAutomations((prev) => prev.filter((auto) => auto.id !== id));
    } catch (error) {
      console.error("Erro ao deletar automação:", error);
      alert("Erro ao deletar automação");
    }
  };

  const filteredAutomations = automations.filter((auto) => {
    const matchesSearch =
      auto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (auto.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesBoard = !selectedBoard || auto.board_id?.toString() === selectedBoard;
    return matchesSearch && matchesBoard;
  });

  const itemsPerPage = 4;
  const totalItems = filteredAutomations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedAutomations = filteredAutomations.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBoard, automations.length]);

  const getPageNumbers = () => {
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const pageNumbers = getPageNumbers();

  const successRate = (auto: Automation) => {
    if (auto.execution_count === 0) return 0;
    return ((auto.success_count / auto.execution_count) * 100).toFixed(1);
  };

  // Verifica permissão de acesso
  if (!isManagerOrAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <div className="mb-4">
            <Shield size={64} className="mx-auto text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-slate-400">
            Apenas administradores e gerentes podem acessar automações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
                <Zap className="text-white" size={32} />
                Automações
              </h1>
              <p className="mt-1 text-slate-400">
                Crie fluxos automáticos para otimizar seu trabalho
              </p>
            </div>
            <button
              onClick={() => setShowRoundRobinForm(true)}
              className="hidden items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 md:flex"
            >
              <Plus size={20} />
              Nova Automação
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={() => setShowRoundRobinForm(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 md:hidden"
            >
              <Plus size={20} />
              Nova Automação
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar automações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="w-full md:w-64">
              <SelectMenu
                value={selectedBoard}
                options={[
                  { value: "", label: "Todos os boards" },
                  ...boards.map((board) => ({ value: String(board.id), label: board.name })),
                ]}
                onChange={setSelectedBoard}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-400">
          {filteredAutomations.length} automaç{filteredAutomations.length !== 1 ? "ões" : "ão"} encontrada
          {filteredAutomations.length !== 1 ? "s" : ""}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">Carregando automações...</p>
          </div>
        )}

        {/* Lista de Automações */}
        {!loading && filteredAutomations.length === 0 && (
          <div className="py-16 text-center">
            <Zap size={64} className="mx-auto mb-4 text-slate-600" />
            <h3 className="mb-2 text-xl font-semibold text-white">
              Nenhuma automação encontrada
            </h3>
            <p className="text-slate-400">
              {searchTerm || selectedBoard
                ? "Tente ajustar os filtros de busca"
                : "Clique no botão 'Nova Automação' no topo para criar sua primeira automação"}
            </p>
          </div>
        )}

        {!loading && filteredAutomations.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {paginatedAutomations.map((automation) => (
                <div
                  key={automation.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur transition-all hover:border-emerald-500/40"
                >
                {/* Header do Card */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {automation.name}
                      </h3>
                      {automation.is_active ? (
                        <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-600/50 px-2 py-1 text-xs font-medium text-slate-400">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-400">
                      {automation.description}
                    </p>
                    {automation.board_name && (
                      <div className="mt-2">
                        <span className="text-xs text-emerald-400">
                          Board: {automation.board_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="mb-4 grid grid-cols-3 gap-4 border-y border-slate-700 py-3">
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                      <BarChart3 size={14} />
                      <span>Execuções</span>
                    </div>
                    <p className="font-semibold text-white">{automation.execution_count}</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-green-400">
                      <CheckCircle size={14} />
                      <span>Sucesso</span>
                    </div>
                    <p className="font-semibold text-white">{successRate(automation)}%</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-red-400">
                      <XCircle size={14} />
                      <span>Erros</span>
                    </div>
                    <p className="font-semibold text-white">{automation.error_count}</p>
                  </div>
                </div>

                {/* Última Execução */}
                {automation.last_executed_at && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={12} />
                    <span>
                      Última execução:{" "}
                      {new Date(automation.last_executed_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(automation.id, automation.is_active)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                      automation.is_active
                        ? "bg-slate-700 text-white hover:bg-slate-600"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {automation.is_active ? (
                      <>
                        <Pause size={16} />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Ativar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingAutomation(automation)}
                    className="rounded-lg bg-yellow-600/20 p-2 text-yellow-400 transition-colors hover:bg-yellow-600/30"
                    title="Editar informações"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => navigate(`/automations/${automation.id}/edit`)}
                    className="rounded-lg bg-purple-600/20 p-2 text-purple-400 transition-colors hover:bg-purple-600/30"
                    title="Construtor de automação"
                  >
                    <Workflow size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="rounded-lg bg-red-600/20 p-2 text-red-400 transition-colors hover:bg-red-600/30"
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
                ))}
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-700/60 pt-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="text-sm text-slate-400">
                Mostrando {totalItems === 0 ? 0 : startIndex + 1} a {endIndex} de {totalItems} registros
              </div>
              <div className="flex items-center justify-center gap-3 sm:justify-end">
                <div className="flex items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safePage === totalPages}
                    className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                      safePage === totalPages
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
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                      onClick={() => setCurrentPage(page)}
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
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safePage === totalPages}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      safePage === totalPages
                        ? "border-slate-700 text-slate-600"
                        : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
                    }`}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal de criação/edição de automação de rodízio */}
      {(showRoundRobinForm || editingAutomation) && (
        <AutomationRoundRobinForm
          automation={editingAutomation || undefined}
          onClose={() => {
            setShowRoundRobinForm(false);
            setEditingAutomation(null);
          }}
          onSuccess={() => {
            setShowRoundRobinForm(false);
            setEditingAutomation(null);
            loadData(); // Recarrega a lista
          }}
        />
      )}
    </div>
  );
};

export default Automations;

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

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange }) => {
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
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
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
