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
  ChevronDown,
  Shield,
  Workflow,
} from "lucide-react";
import { useAuth, usePagination, useFilter, filterHelpers } from "../hooks";
import automationService, { Automation } from "../services/automationService";
import boardService from "../services/boardService";
import AutomationRoundRobinForm from "../components/AutomationRoundRobinForm";
import { showSuccess, showError } from "../utils/toast";
import { LoadingSpinner, SearchInput, Pagination } from "../components/common";
import { PageHeader } from "../components/layout";

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
  const [showRoundRobinForm, setShowRoundRobinForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  // Hook de filtros
  const {
    filteredItems: filteredAutomations,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
  } = useFilter<Automation>(automations, {
    search: filterHelpers.searchInFields(["name", "description"]),
    board: (auto, boardId) => !boardId || auto.board_id?.toString() === boardId,
  });

  // Hook de paginação
  const pagination = usePagination(filteredAutomations, 4);

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
      showError("Erro ao alterar status da automação");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar esta automação?")) return;

    try {
      await automationService.delete(id);
      setAutomations((prev) => prev.filter((auto) => auto.id !== id));
    } catch (error) {
      console.error("Erro ao deletar automação:", error);
      showError("Erro ao deletar automação");
    }
  };

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
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Apenas administradores e gerentes podem acessar automações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
        {/* Header */}
        <PageHeader
          title="Automações"
          description="Crie fluxos automáticos para otimizar seu trabalho"
          icon={Zap}
          actions={
            <button
              onClick={() => setShowRoundRobinForm(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Plus size={20} />
              Nova Automação
            </button>
          }
        />

        <div className="mb-8">
          {/* Filtros */}
          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={() => setShowRoundRobinForm(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 md:hidden"
            >
              <Plus size={20} />
              Nova Automação
            </button>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar automações..."
            />
            <div className="w-full md:w-64">
              <SelectMenu
                value={customFilters.board || ""}
                options={[
                  { value: "", label: "Todos os boards" },
                  ...boards.map((board) => ({ value: String(board.id), label: board.name })),
                ]}
                onChange={(value) => setCustomFilter("board", value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {filteredAutomations.length} automaç{filteredAutomations.length !== 1 ? "ões" : "ão"} encontrada
          {filteredAutomations.length !== 1 ? "s" : ""}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">Carregando automações...</p>
          </div>
        )}

        {/* Lista de Automações */}
        {!loading && filteredAutomations.length === 0 && (
          <div className="py-16 text-center">
            <Zap size={64} className="mx-auto mb-4 text-slate-400 dark:text-slate-600" />
            <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
              Nenhuma automação encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm || customFilters.board
                ? "Tente ajustar os filtros de busca"
                : "Clique no botão 'Nova Automação' no topo para criar sua primeira automação"}
            </p>
          </div>
        )}

        {!loading && filteredAutomations.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30 sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {pagination.paginatedItems.map((automation) => (
                <div
                  key={automation.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-emerald-500/40 dark:border-slate-700 dark:bg-slate-800/50"
                >
                {/* Header do Card */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {automation.name}
                      </h3>
                      {automation.is_active ? (
                        <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-slate-900 dark:text-green-400">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-slate-900 dark:bg-slate-600/50 dark:text-slate-400">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
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
                <div className="mb-4 grid grid-cols-3 gap-4 border-y border-gray-200 py-3 dark:border-slate-700">
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <BarChart3 size={14} />
                      <span>Execuções</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{automation.execution_count}</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-green-400">
                      <CheckCircle size={14} />
                      <span>Sucesso</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{successRate(automation)}%</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-red-400">
                      <XCircle size={14} />
                      <span>Erros</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{automation.error_count}</p>
                  </div>
                </div>

                {/* Última Execução */}
                {automation.last_executed_at && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                        ? "bg-gray-200 text-slate-900 hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
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
                    className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                    title="Editar informações"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => navigate(`/automations/${automation.id}/edit`)}
                    className="rounded-lg bg-purple-600/20 p-2 text-slate-900 dark:text-purple-400 transition-colors hover:bg-purple-600/30"
                    title="Construtor de automação"
                  >
                    <Workflow size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="rounded-lg bg-red-600/20 p-2 text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
                ))}
            </div>
            {/* Paginação */}
            <Pagination
              {...pagination}
              totalItems={filteredAutomations.length}
              itemLabel="automações"
            />
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
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
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
