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
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import automationService, { Automation } from "../services/automationService";
import boardService from "../services/boardService";

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

  // Verifica se o usuário é admin ou manager
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // TODO: Temporariamente usando dados mockados
      // Quando backend estiver pronto, usar: automationService.list()

      // Carrega boards reais
      const boardsResponse = await boardService.list();
      setBoards(boardsResponse.boards || []);

      // Dados mockados de automações
      const mockAutomations: Automation[] = [
        {
          id: 1,
          name: "Vendas → Pós-Venda Automático",
          description: "Quando um card for marcado como ganho em Vendas, criar automaticamente no Pós-Venda",
          board_id: 1,
          board_name: "Vendas",
          is_active: true,
          nodes: [],
          edges: [],
          created_by: 1,
          created_at: "2026-01-20T10:00:00Z",
          updated_at: "2026-01-21T15:30:00Z",
          last_executed_at: "2026-01-21T18:45:00Z",
          execution_count: 47,
          success_count: 45,
          error_count: 2,
        },
        {
          id: 2,
          name: "Notificar Gerente - Card Alto Valor",
          description: "Enviar notificação para o gerente quando um card acima de R$ 10.000 for criado",
          board_id: 1,
          board_name: "Vendas",
          is_active: true,
          nodes: [],
          edges: [],
          created_by: 1,
          created_at: "2026-01-18T14:20:00Z",
          updated_at: "2026-01-18T14:20:00Z",
          last_executed_at: "2026-01-21T16:10:00Z",
          execution_count: 12,
          success_count: 12,
          error_count: 0,
        },
        {
          id: 3,
          name: "Follow-up Automático - 3 dias",
          description: "Criar tarefa de follow-up 3 dias após card ser movido para 'Proposta Enviada'",
          board_id: 1,
          board_name: "Vendas",
          is_active: false,
          nodes: [],
          edges: [],
          created_by: 1,
          created_at: "2026-01-15T09:00:00Z",
          updated_at: "2026-01-19T11:22:00Z",
          execution_count: 0,
          success_count: 0,
          error_count: 0,
        },
        {
          id: 4,
          name: "Email Boas-Vindas - Cliente Novo",
          description: "Enviar email de boas-vindas quando cliente for cadastrado",
          board_id: 2,
          board_name: "Onboarding",
          is_active: true,
          nodes: [],
          edges: [],
          created_by: 1,
          created_at: "2026-01-10T08:30:00Z",
          updated_at: "2026-01-10T08:30:00Z",
          last_executed_at: "2026-01-21T17:00:00Z",
          execution_count: 89,
          success_count: 87,
          error_count: 2,
        },
      ];

      setAutomations(mockAutomations);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      // TODO: Quando backend estiver pronto
      // await automationService.toggleActive(id, !currentStatus);

      // Mock: atualiza localmente
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
      // TODO: Quando backend estiver pronto
      // await automationService.delete(id);

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
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-4">
            <Shield size={64} className="mx-auto text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Zap className="text-white" size={32} />
                Automações
              </h1>
              <p className="text-slate-400 mt-1">
                Crie fluxos automáticos para otimizar seu trabalho
              </p>
            </div>
            <button
              onClick={() => navigate("/automations/new")}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Nova Automação
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => navigate("/automations/new")}
              className="md:hidden flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Nova Automação
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar automações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-slate-400 mt-4">Carregando automações...</p>
          </div>
        )}

        {/* Lista de Automações */}
        {!loading && filteredAutomations.length === 0 && (
          <div className="text-center py-16">
            <Zap size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhuma automação encontrada
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || selectedBoard
                ? "Tente ajustar os filtros de busca"
                : "Crie sua primeira automação para começar"}
            </p>
            {!searchTerm && !selectedBoard && (
              <button
                onClick={() => navigate("/automations/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Criar Primeira Automação
              </button>
            )}
          </div>
        )}

        {!loading && filteredAutomations.length > 0 && (
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedAutomations.map((automation) => (
                <div
                  key={automation.id}
                  className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-emerald-500/40 transition-all"
                >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {automation.name}
                      </h3>
                      {automation.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs font-medium rounded-full">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">
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
                <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-slate-700">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <BarChart3 size={14} />
                      <span>Execuções</span>
                    </div>
                    <p className="text-white font-semibold">{automation.execution_count}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-400 text-xs mb-1">
                      <CheckCircle size={14} />
                      <span>Sucesso</span>
                    </div>
                    <p className="text-white font-semibold">{successRate(automation)}%</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-400 text-xs mb-1">
                      <XCircle size={14} />
                      <span>Erros</span>
                    </div>
                    <p className="text-white font-semibold">{automation.error_count}</p>
                  </div>
                </div>

                {/* Última Execução */}
                {automation.last_executed_at && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
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
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      automation.is_active
                        ? "bg-slate-700 hover:bg-slate-600 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
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
                    onClick={() => navigate(`/automations/${automation.id}/edit`)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
        className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
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
