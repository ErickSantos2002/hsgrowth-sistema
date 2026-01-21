import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import automationService, { Automation } from "../services/automationService";
import boardService from "../services/boardService";

interface Board {
  id: number;
  name: string;
}

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<string>("");

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

  const successRate = (auto: Automation) => {
    if (auto.execution_count === 0) return 0;
    return ((auto.success_count / auto.execution_count) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Zap className="text-purple-400" size={32} />
                Automações
              </h1>
              <p className="text-slate-400 mt-1">
                Crie fluxos automáticos para otimizar seu trabalho
              </p>
            </div>
            <button
              onClick={() => navigate("/automations/new")}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/30"
            >
              <Plus size={20} />
              Nova Automação
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar automações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos os boards</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Criar Primeira Automação
              </button>
            )}
          </div>
        )}

        {!loading && filteredAutomations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAutomations.map((automation) => (
              <div
                key={automation.id}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
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
                        <span className="text-xs text-purple-400">
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
        )}
      </div>
    </div>
  );
};

export default Automations;
