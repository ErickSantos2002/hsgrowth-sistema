import React, { useState, useEffect, useRef } from "react";
import { X, Save, AlertCircle, ChevronDown } from "lucide-react";
import { Node as FlowNode } from "reactflow";

interface NodeConfigPanelProps {
  node: FlowNode | null;
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
              <SelectMenu
                value={config.board_id || ""}
                onChange={(value) => updateConfig("board_id", value)}
                options={[
                  { value: "", label: "Qualquer board" },
                  { value: "1", label: "Vendas" },
                  { value: "2", label: "Pós-Venda" },
                  { value: "3", label: "Suporte" },
                ]}
              />
            </div>

            {nodeType === "card_moved" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Para a lista
                </label>
                <SelectMenu
                  value={config.list_id || ""}
                  onChange={(value) => updateConfig("list_id", value)}
                  options={[
                    { value: "", label: "Qualquer lista" },
                    { value: "1", label: "Novo Lead" },
                    { value: "2", label: "Contato Feito" },
                    { value: "3", label: "Proposta Enviada" },
                    { value: "4", label: "Negociação" },
                    { value: "5", label: "Ganho" },
                    { value: "6", label: "Perdido" },
                  ]}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Condição adicional (opcional)
              </label>
              <div className="mb-2">
                <SelectMenu
                  value={config.condition_field || ""}
                  onChange={(value) => updateConfig("condition_field", value)}
                  options={[
                    { value: "", label: "Nenhuma condição" },
                    { value: "value", label: "Valor do card" },
                    { value: "priority", label: "Prioridade" },
                    { value: "days_in_stage", label: "Dias no estágio" },
                  ]}
                />
              </div>

              {config.condition_field && (
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <SelectMenu
                      value={config.condition_operator || ">"}
                      onChange={(value) => updateConfig("condition_operator", value)}
                      options={[
                        { value: ">", label: ">" },
                        { value: "<", label: "<" },
                        { value: "=", label: "=" },
                        { value: ">=", label: "≥" },
                        { value: "<=", label: "≤" },
                      ]}
                    />
                  </div>
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
              <SelectMenu
                value={config.board_id || ""}
                onChange={(value) => updateConfig("board_id", value)}
                options={[
                  { value: "", label: "Qualquer board" },
                  { value: "1", label: "Vendas" },
                  { value: "2", label: "Pós-Venda" },
                  { value: "3", label: "Suporte" },
                ]}
              />
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
              <SelectMenu
                value={config.frequency || "daily"}
                onChange={(value) => updateConfig("frequency", value)}
                options={[
                  { value: "daily", label: "Diariamente" },
                  { value: "weekly", label: "Semanalmente" },
                  { value: "monthly", label: "Mensalmente" },
                ]}
              />
            </div>

            {config.frequency === "weekly" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dia da semana
                </label>
                <SelectMenu
                  value={config.day_of_week || "1"}
                  onChange={(value) => updateConfig("day_of_week", value)}
                  options={[
                    { value: "0", label: "Domingo" },
                    { value: "1", label: "Segunda" },
                    { value: "2", label: "Terça" },
                    { value: "3", label: "Quarta" },
                    { value: "4", label: "Quinta" },
                    { value: "5", label: "Sexta" },
                    { value: "6", label: "Sábado" },
                  ]}
                />
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
              <SelectMenu
                value={config.target_board_id || ""}
                onChange={(value) => updateConfig("target_board_id", value)}
                options={[
                  { value: "", label: "Selecione o board" },
                  { value: "1", label: "Vendas" },
                  { value: "2", label: "Pós-Venda" },
                  { value: "3", label: "Suporte" },
                ]}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lista de destino *
              </label>
              <SelectMenu
                value={config.target_list_id || ""}
                onChange={(value) => updateConfig("target_list_id", value)}
                options={[
                  { value: "", label: "Selecione a lista" },
                  { value: "1", label: "Novo Lead" },
                  { value: "2", label: "Contato Feito" },
                  { value: "3", label: "Proposta Enviada" },
                ]}
              />
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
              <SelectMenu
                value={config.recipient_type || ""}
                onChange={(value) => updateConfig("recipient_type", value)}
                options={[
                  { value: "", label: "Selecione" },
                  { value: "assigned_user", label: "Usuário responsável pelo card" },
                  { value: "board_owner", label: "Dono do board" },
                  { value: "all_users", label: "Todos os usuários" },
                  { value: "specific_user", label: "Usuário específico" },
                ]}
              />
            </div>
            {config.recipient_type === "specific_user" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Usuário
                </label>
                <SelectMenu
                  value={config.user_id || ""}
                  onChange={(value) => updateConfig("user_id", value)}
                  options={[
                    { value: "", label: "Selecione o usuário" },
                    { value: "1", label: "João Silva" },
                    { value: "2", label: "Maria Santos" },
                    { value: "3", label: "Pedro Costa" },
                  ]}
                />
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
              <SelectMenu
                value={config.user_id || ""}
                onChange={(value) => updateConfig("user_id", value)}
                options={[
                  { value: "", label: "Selecione o usuário" },
                  { value: "1", label: "João Silva" },
                  { value: "2", label: "Maria Santos" },
                  { value: "3", label: "Pedro Costa" },
                  { value: "4", label: "Ana Oliveira" },
                ]}
              />
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
              <SelectMenu
                value={config.tag_color || "blue"}
                onChange={(value) => updateConfig("tag_color", value)}
                options={[
                  { value: "blue", label: "Azul" },
                  { value: "green", label: "Verde" },
                  { value: "red", label: "Vermelho" },
                  { value: "yellow", label: "Amarelo" },
                  { value: "purple", label: "Roxo" },
                  { value: "pink", label: "Rosa" },
                ]}
              />
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
              <SelectMenu
                value={config.target_board_id || ""}
                onChange={(value) => updateConfig("target_board_id", value)}
                options={[
                  { value: "", label: "Selecione o board" },
                  { value: "same", label: "Mesmo board" },
                  { value: "1", label: "Vendas" },
                  { value: "2", label: "Pós-Venda" },
                  { value: "3", label: "Suporte" },
                ]}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lista de destino *
              </label>
              <SelectMenu
                value={config.target_list_id || ""}
                onChange={(value) => updateConfig("target_list_id", value)}
                options={[
                  { value: "", label: "Selecione a lista" },
                  { value: "1", label: "Novo Lead" },
                  { value: "2", label: "Contato Feito" },
                  { value: "3", label: "Proposta Enviada" },
                  { value: "4", label: "Negociação" },
                  { value: "5", label: "Ganho" },
                  { value: "6", label: "Perdido" },
                ]}
              />
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
              <SelectMenu
                value={config.field_name || ""}
                onChange={(value) => updateConfig("field_name", value)}
                options={[
                  { value: "", label: "Selecione o campo" },
                  { value: "priority", label: "Prioridade" },
                  { value: "value", label: "Valor" },
                  { value: "description", label: "Descrição" },
                  { value: "due_date", label: "Data de vencimento" },
                ]}
              />
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
    <div className="w-80 bg-slate-800/50 backdrop-blur border-l border-slate-700 p-4 overflow-y-auto overflow-x-hidden max-h-[85vh] sm:max-h-[calc(100vh-140px)]">
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
      if (!menuRef.current.contains(event.target as globalThis.Node)) {
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

export default NodeConfigPanel;
