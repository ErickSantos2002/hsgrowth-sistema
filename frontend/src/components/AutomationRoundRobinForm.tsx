import React, { useState, useEffect } from "react";
import { X, Users, List, Zap } from "lucide-react";
import automationService from "../services/automationService";
import boardService from "../services/boardService";

interface Board {
  id: number;
  name: string;
}

interface BoardList {
  id: number;
  name: string;
  board_id: number;
}

interface AutomationRoundRobinFormProps {
  onClose: () => void;
  onSuccess: () => void;
  automation?: any; // Para edição futura
}

const AutomationRoundRobinForm: React.FC<AutomationRoundRobinFormProps> = ({
  onClose,
  onSuccess,
  automation,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  const [formData, setFormData] = useState({
    name: automation?.name || "",
    description: automation?.description || "",
    board_id: automation?.board_id || "",
    target_list_id: automation?.trigger_conditions?.to_list_id || "",
    is_active: automation?.is_active !== undefined ? automation.is_active : true,
  });

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (formData.board_id) {
      loadLists(Number(formData.board_id));
    }
  }, [formData.board_id]);

  const loadBoards = async () => {
    try {
      const response = await boardService.list();
      setBoards(response.boards || []);
    } catch (error) {
      console.error("Erro ao carregar boards:", error);
    }
  };

  const loadLists = async (boardId: number) => {
    try {
      setLoadingLists(true);
      const response = await boardService.getLists(boardId);
      setLists(response || []);
    } catch (error) {
      console.error("Erro ao carregar listas:", error);
      setLists([]);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.board_id || !formData.target_list_id) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);

      const automationData = {
        name: formData.name,
        description: formData.description,
        board_id: Number(formData.board_id),
        automation_type: "trigger",
        trigger_event: "card_moved",
        trigger_conditions: {
          to_list_id: Number(formData.target_list_id),
        },
        actions: [
          {
            type: "assign_round_robin",
            params: {},
          },
        ],
        is_active: formData.is_active,
        priority: 100,
      };

      if (automation?.id) {
        await automationService.update(automation.id, automationData as any);
      } else {
        await automationService.create(automationData as any);
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar automação:", error);
      alert("Erro ao salvar automação. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {automation ? "Editar" : "Nova"} Automação
              </h2>
              <p className="text-sm text-slate-400">
                Rodízio de vendedores - Distribui cards automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome da Automação *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: Rodízio RD - Atribuir Vendedor"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Descreva o que essa automação faz..."
              rows={3}
            />
          </div>

          {/* Board */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Board *
            </label>
            <select
              value={formData.board_id}
              onChange={(e) => setFormData({ ...formData, board_id: e.target.value, target_list_id: "" })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Selecione um board</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de destino */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Lista de Destino (trigger) *
            </label>
            <div className="relative">
              <List className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={formData.target_list_id}
                onChange={(e) => setFormData({ ...formData, target_list_id: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                required
                disabled={!formData.board_id || loadingLists}
              >
                <option value="">
                  {loadingLists
                    ? "Carregando listas..."
                    : !formData.board_id
                    ? "Selecione um board primeiro"
                    : "Selecione a lista"}
                </option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Quando um card chegar nesta lista, será automaticamente atribuído ao próximo vendedor
            </p>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">
              Automação ativa (começar a executar imediatamente)
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-200">
                <p className="font-medium mb-1">Como funciona:</p>
                <ul className="space-y-1 text-purple-300">
                  <li>• Cards que chegarem na lista selecionada serão distribuídos automaticamente</li>
                  <li>• Apenas vendedores ativos participam do rodízio</li>
                  <li>• O sistema garante distribuição equilibrada entre todos os vendedores</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Salvando..." : automation ? "Atualizar" : "Criar"} Automação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AutomationRoundRobinForm;
