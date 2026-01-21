import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Node } from "reactflow";

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onSave }) => {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (node) {
      // Carrega configuração existente do node
      setConfig(node.data.config || {});
    }
  }, [node]);

  if (!node) return null;

  const isTrigger = node.type === "triggerNode";
  const nodeType = isTrigger ? node.data.triggerType : node.data.actionType;

  const handleSave = () => {
    onSave(node.id, config);
    onClose();
  };

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  // Renderiza form específico para cada tipo de trigger
  const renderTriggerConfig = () => {
    switch (nodeType) {
      case "card_created":
      case "card_won":
      case "card_lost":
      case "card_moved":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Board
              </label>
              <select
                value={config.board_id || ""}
                onChange={(e) => updateConfig("board_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Qualquer board</option>
                <option value="1">Vendas</option>
                <option value="2">Pós-Venda</option>
                <option value="3">Suporte</option>
              </select>
            </div>

            {nodeType === "card_moved" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Para a lista
                </label>
                <select
                  value={config.list_id || ""}
                  onChange={(e) => updateConfig("list_id", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Qualquer lista</option>
                  <option value="1">Novo Lead</option>
                  <option value="2">Contato Feito</option>
                  <option value="3">Proposta Enviada</option>
                  <option value="4">Negociação</option>
                  <option value="5">Ganho</option>
                  <option value="6">Perdido</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Condição adicional (opcional)
              </label>
              <select
                value={config.condition_field || ""}
                onChange={(e) => updateConfig("condition_field", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
              >
                <option value="">Nenhuma condição</option>
                <option value="value">Valor do card</option>
                <option value="priority">Prioridade</option>
                <option value="days_in_stage">Dias no estágio</option>
              </select>

              {config.condition_field && (
                <div className="flex gap-2">
                  <select
                    value={config.condition_operator || ""}
                    onChange={(e) => updateConfig("condition_operator", e.target.value)}
                    className="w-1/3 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                  </select>
                  <input
                    type="text"
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="Valor"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </>
        );

      case "card_overdue":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Board
              </label>
              <select
                value={config.board_id || ""}
                onChange={(e) => updateConfig("board_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Qualquer board</option>
                <option value="1">Vendas</option>
                <option value="2">Pós-Venda</option>
                <option value="3">Suporte</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dias de atraso
              </label>
              <input
                type="number"
                min="1"
                value={config.days_overdue || 1}
                onChange={(e) => updateConfig("days_overdue", parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        );

      case "scheduled":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Frequência
              </label>
              <select
                value={config.frequency || "daily"}
                onChange={(e) => updateConfig("frequency", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Diariamente</option>
                <option value="weekly">Semanalmente</option>
                <option value="monthly">Mensalmente</option>
              </select>
            </div>

            {config.frequency === "weekly" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dia da semana
                </label>
                <select
                  value={config.day_of_week || "1"}
                  onChange={(e) => updateConfig("day_of_week", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
            )}

            {config.frequency === "monthly" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dia do mês
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.day_of_month || 1}
                  onChange={(e) => updateConfig("day_of_month", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Horário
              </label>
              <input
                type="time"
                value={config.time || "09:00"}
                onChange={(e) => updateConfig("time", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Renderiza form específico para cada tipo de ação
  const renderActionConfig = () => {
    switch (nodeType) {
      case "create_card":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Board de destino *
              </label>
              <select
                value={config.target_board_id || ""}
                onChange={(e) => updateConfig("target_board_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione o board</option>
                <option value="1">Vendas</option>
                <option value="2">Pós-Venda</option>
                <option value="3">Suporte</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lista de destino *
              </label>
              <select
                value={config.target_list_id || ""}
                onChange={(e) => updateConfig("target_list_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione a lista</option>
                <option value="1">Novo Lead</option>
                <option value="2">Contato Feito</option>
                <option value="3">Proposta Enviada</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título do card *
              </label>
              <input
                type="text"
                value={config.title || ""}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Ex: Card criado automaticamente"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={config.description || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Descrição do card..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </>
        );

      case "send_email":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Para *
              </label>
              <input
                type="email"
                value={config.to || ""}
                onChange={(e) => updateConfig("to", e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">
                Use variáveis: {"{"}client_email{"}"}, {"{"}user_email{"}"}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assunto *
              </label>
              <input
                type="text"
                value={config.subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Assunto do email"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Corpo da mensagem *
              </label>
              <textarea
                value={config.body || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                placeholder="Corpo do email..."
                rows={5}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                Variáveis disponíveis: {"{"}card_title{"}"}, {"{"}card_value{"}"}, {"{"}client_name{"}"}
              </p>
            </div>
          </>
        );

      case "create_notification":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Destinatário *
              </label>
              <select
                value={config.recipient_type || ""}
                onChange={(e) => updateConfig("recipient_type", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="assigned_user">Usuário responsável pelo card</option>
                <option value="board_owner">Dono do board</option>
                <option value="all_users">Todos os usuários</option>
                <option value="specific_user">Usuário específico</option>
              </select>
            </div>
            {config.recipient_type === "specific_user" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Usuário
                </label>
                <select
                  value={config.user_id || ""}
                  onChange={(e) => updateConfig("user_id", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Selecione o usuário</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                  <option value="3">Pedro Costa</option>
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mensagem *
              </label>
              <textarea
                value={config.message || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="Mensagem da notificação..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </>
        );

      case "assign_user":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Atribuir para *
              </label>
              <select
                value={config.user_id || ""}
                onChange={(e) => updateConfig("user_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione o usuário</option>
                <option value="1">João Silva</option>
                <option value="2">Maria Santos</option>
                <option value="3">Pedro Costa</option>
                <option value="4">Ana Oliveira</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={config.notify_user || false}
                  onChange={(e) => updateConfig("notify_user", e.target.checked)}
                  className="w-4 h-4 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm">Notificar o usuário</span>
              </label>
            </div>
          </>
        );

      case "add_tag":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nome da tag *
              </label>
              <input
                type="text"
                value={config.tag_name || ""}
                onChange={(e) => updateConfig("tag_name", e.target.value)}
                placeholder="Ex: Urgente, VIP, Follow-up"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cor da tag
              </label>
              <select
                value={config.tag_color || "blue"}
                onChange={(e) => updateConfig("tag_color", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="red">Vermelho</option>
                <option value="yellow">Amarelo</option>
                <option value="purple">Roxo</option>
                <option value="pink">Rosa</option>
              </select>
            </div>
          </>
        );

      case "move_to_list":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Board de destino *
              </label>
              <select
                value={config.target_board_id || ""}
                onChange={(e) => updateConfig("target_board_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione o board</option>
                <option value="same">Mesmo board</option>
                <option value="1">Vendas</option>
                <option value="2">Pós-Venda</option>
                <option value="3">Suporte</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lista de destino *
              </label>
              <select
                value={config.target_list_id || ""}
                onChange={(e) => updateConfig("target_list_id", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione a lista</option>
                <option value="1">Novo Lead</option>
                <option value="2">Contato Feito</option>
                <option value="3">Proposta Enviada</option>
                <option value="4">Negociação</option>
                <option value="5">Ganho</option>
                <option value="6">Perdido</option>
              </select>
            </div>
          </>
        );

      case "update_field":
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Campo a atualizar *
              </label>
              <select
                value={config.field_name || ""}
                onChange={(e) => updateConfig("field_name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione o campo</option>
                <option value="priority">Prioridade</option>
                <option value="value">Valor</option>
                <option value="description">Descrição</option>
                <option value="due_date">Data de vencimento</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Novo valor *
              </label>
              <input
                type="text"
                value={config.field_value || ""}
                onChange={(e) => updateConfig("field_value", e.target.value)}
                placeholder="Novo valor do campo"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-96 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{node.data.label}</h3>
          <p className="text-sm text-slate-400 mt-1">
            {isTrigger ? "Configurar gatilho" : "Configurar ação"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      {/* Alert de informação */}
      <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
        <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Configure os parâmetros necessários para este {isTrigger ? "gatilho" : "ação"}.
          Campos marcados com * são obrigatórios.
        </p>
      </div>

      {/* Form de configuração */}
      <div className="mb-6">
        {isTrigger ? renderTriggerConfig() : renderActionConfig()}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
        >
          <Save size={16} />
          Salvar
        </button>
      </div>
    </div>
  );
};

export default NodeConfigPanel;
