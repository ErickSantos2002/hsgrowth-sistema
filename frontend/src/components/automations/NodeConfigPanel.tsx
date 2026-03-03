import React, { useState, useEffect, useRef } from "react";
import { X, Save, AlertCircle, ChevronDown } from "lucide-react";
import { Node as FlowNode } from "reactflow";
import boardService from "../../services/boardService";
import userService from "../../services/userService";
import { showError } from "../../utils/toast";

interface NodeConfigPanelProps {
  node: FlowNode | null;
  onClose: () => void;
  onSave: (_nodeId: string, _config: any) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onSave }) => {
  const [config, setConfig] = useState<any>({});
  const [boards, setBoards] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node) {
      // Carrega configuração existente do node
      setConfig(node.data.config || {});
    }
    // Carrega dados iniciais
    loadBoards();
    loadUsers();
  }, [node]);

  // Carrega listas quando board é selecionado
  useEffect(() => {
    // Para triggers (card_moved): usa board_id
    if (config.board_id) {
      loadLists(Number(config.board_id));
    }
    // Para actions (move_card): usa target_board_id
    else if (config.target_board_id) {
      loadLists(Number(config.target_board_id));
    }
  }, [config.board_id, config.target_board_id]);

  const loadBoards = async () => {
    try {
      const response = await boardService.list();
      setBoards(response.boards || []);
    } catch (error) {
      console.error("Erro ao carregar boards:", error);
      showError("Erro ao carregar boards. Tente novamente.");
    }
  };

  const loadLists = async (boardId: number) => {
    try {
      setLoading(true);
      const response = await boardService.getLists(boardId);
      setLists(response || []);
    } catch (error) {
      console.error("Erro ao carregar listas:", error);
      showError("Erro ao carregar listas do board. Tente novamente.");
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userService.listActive();
      // Carrega todos os usuários ativos (filtro específico será feito na renderização)
      setUsers(response);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      showError("Erro ao carregar usuários. Tente novamente.");
    }
  };

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
            {nodeType === "card_moved" && (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Board
                  </label>
                  <SelectMenu
                    value={config.board_id || ""}
                    onChange={(value) => updateConfig("board_id", value)}
                    options={[
                      { value: "", label: "Qualquer board" },
                      ...boards.map(b => ({ value: String(b.id), label: b.name }))
                    ]}
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Para a lista
                  </label>
                  <SelectMenu
                    value={config.to_list_id || ""}
                    onChange={(value) => updateConfig("to_list_id", value)}
                    options={[
                      { value: "", label: loading ? "Carregando..." : "Qualquer lista" },
                      ...lists.map(l => ({ value: String(l.id), label: l.name }))
                    ]}
                    disabled={!config.board_id}
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                    Deixe vazio para qualquer movimento de card
                  </p>
                </div>
              </>
            )}
          </>
        );

      case "scheduled":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Frequência
              </label>
              <SelectMenu
                value={config.recurrence_pattern || "daily"}
                onChange={(value) => updateConfig("recurrence_pattern", value)}
                options={[
                  { value: "daily", label: "Diariamente" },
                  { value: "weekly", label: "Semanalmente" },
                  { value: "monthly", label: "Mensalmente" },
                  { value: "annual", label: "Anualmente" },
                ]}
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Horário
              </label>
              <input
                type="time"
                value={config.time || "09:00"}
                onChange={(e) => updateConfig("time", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white focus:border-transparent focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </>
        );

      case "manual":
        return (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
            <p className="mb-2">👆 <strong>Trigger Manual</strong></p>
            <p>Esta automação será executada apenas quando um usuário clicar em um botão específico (ex: no card ou em uma lista).</p>
            <p className="mt-2 text-xs">Não requer configuração adicional.</p>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-400 dark:text-slate-400">
            Este gatilho não requer configuração adicional.
          </div>
        );
    }
  };

  // Renderiza form específico para cada tipo de ação
  const renderActionConfig = () => {
    switch (nodeType) {
      case "assign_round_robin":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Vendedores no rodízio
              </label>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 p-3">
                {users.filter(u => u.role === "salesperson").length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-400">Nenhum vendedor encontrado</p>
                ) : (
                  users.filter(u => u.role === "salesperson").map((user) => {
                    const isSelected = (config.user_ids || []).includes(String(user.id));
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentIds = config.user_ids || [];
                            let newIds;
                            if (e.target.checked) {
                              newIds = [...currentIds, String(user.id)];
                            } else {
                              newIds = currentIds.filter((id: string) => id !== String(user.id));
                            }
                            updateConfig("user_ids", newIds);
                          }}
                          className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700 focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-900 dark:text-white">
                          {user.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                {(config.user_ids || []).length === 0
                  ? "⚠️ Nenhum vendedor selecionado. Todos os vendedores ativos participarão do rodízio."
                  : `✓ ${(config.user_ids || []).length} vendedor(es) selecionado(s)`}
              </p>
            </div>

            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
              <p className="mb-2">🔄 <strong>Como funciona:</strong></p>
              <p>Cards serão distribuídos automaticamente entre os vendedores selecionados em sistema de rodízio equilibrado.</p>
            </div>
          </>
        );

      case "assign_sdr_round_robin":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                SDRs no rodízio
              </label>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-200/50 dark:bg-slate-700/50 p-3">
                {users.filter(u => u.role === "sdr").length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-400">Nenhum SDR encontrado</p>
                ) : (
                  users.filter(u => u.role === "sdr").map((user) => {
                    const isSelected = (config.user_ids || []).includes(String(user.id));
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentIds = config.user_ids || [];
                            let newIds;
                            if (e.target.checked) {
                              newIds = [...currentIds, String(user.id)];
                            } else {
                              newIds = currentIds.filter((id: string) => id !== String(user.id));
                            }
                            updateConfig("user_ids", newIds);
                          }}
                          className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-slate-900 dark:text-white">
                          {user.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                {(config.user_ids || []).length === 0
                  ? "⚠️ Nenhum SDR selecionado. Todos os SDRs ativos participarão do rodízio."
                  : `✓ ${(config.user_ids || []).length} SDR(s) selecionado(s)`}
              </p>
            </div>

            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
              <p className="mb-2">🔄 <strong>Como funciona:</strong></p>
              <p>Cards serão distribuídos automaticamente entre os SDRs selecionados em sistema de rodízio equilibrado.</p>
            </div>
          </>
        );

      case "assign_card":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Atribuir para *
              </label>
              <SelectMenu
                value={config.user_id || ""}
                onChange={(value) => updateConfig("user_id", value)}
                options={[
                  { value: "", label: "Selecione o vendedor" },
                  ...users.map(u => ({
                    value: String(u.id),
                    label: `${u.name} ${u.role === "manager" ? "(Gerente)" : ""}`
                  }))
                ]}
              />
            </div>
          </>
        );

      case "move_card":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Board de destino *
              </label>
              <SelectMenu
                value={config.target_board_id || ""}
                onChange={(value) => updateConfig("target_board_id", value)}
                options={[
                  { value: "", label: "Selecione o board" },
                  ...boards.map(b => ({ value: String(b.id), label: b.name }))
                ]}
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Lista de destino *
              </label>
              <SelectMenu
                value={config.target_list_id || ""}
                onChange={(value) => updateConfig("target_list_id", value)}
                options={[
                  { value: "", label: loading ? "Carregando..." : "Selecione a lista" },
                  ...lists.map(l => ({ value: String(l.id), label: l.name }))
                ]}
                disabled={!config.target_board_id}
              />
            </div>
          </>
        );

      case "mark_won":
        return (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
            <p className="mb-2">✅ <strong>Marcar como Ganho</strong></p>
            <p>Esta ação marca o card como ganho automaticamente.</p>
            <p className="mt-2 text-xs">Não requer configuração adicional.</p>
          </div>
        );

      case "mark_lost":
        return (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
            <p className="mb-2">❌ <strong>Marcar como Perdido</strong></p>
            <p>Esta ação marca o card como perdido automaticamente.</p>
            <p className="mt-2 text-xs">Não requer configuração adicional.</p>
          </div>
        );

      case "send_notification":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Destinatário *
              </label>
              <SelectMenu
                value={config.user_id || ""}
                onChange={(value) => updateConfig("user_id", value)}
                options={[
                  { value: "", label: "Selecione o usuário" },
                  ...users.map(u => ({ value: String(u.id), label: u.name }))
                ]}
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Mensagem *
              </label>
              <textarea
                value={config.message || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="Mensagem da notificação..."
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                Variáveis: {"{"}card_title{"}"}, {"{"}user_name{"}"}
              </p>
            </div>
          </>
        );

      case "update_client_field":
        return (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Campo do Cliente *
              </label>
              <SelectMenu
                value={config.field_name || ""}
                onChange={(value) => {
                  updateConfig("field_name", value);
                  // Limpa o valor quando muda o campo
                  updateConfig("value", "");
                }}
                options={[
                  { value: "", label: "Selecione o campo" },
                  { value: "relationship_type", label: "Tipo de Relacionamento" },
                  { value: "commercial_activity", label: "Atividade Comercial" },
                  { value: "sector", label: "Setor/Indústria" },
                  { value: "employee_count", label: "Quantidade de Funcionários" },
                  { value: "annual_revenue", label: "Faturamento Anual" },
                  { value: "cnae", label: "CNAE" },
                  { value: "linkedin_url", label: "LinkedIn" },
                ]}
              />
            </div>

            {config.field_name === "relationship_type" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor *
                </label>
                <SelectMenu
                  value={config.value || ""}
                  onChange={(value) => updateConfig("value", value)}
                  options={[
                    { value: "", label: "Selecione o valor" },
                    { value: "Lead", label: "Lead" },
                    { value: "Prospect", label: "Prospect" },
                    { value: "Cliente", label: "Cliente" },
                  ]}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                  Nota: Cliente → Lead/Prospect é bloqueado pelo sistema
                </p>
              </div>
            )}

            {config.field_name === "commercial_activity" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor *
                </label>
                <SelectMenu
                  value={config.value || ""}
                  onChange={(value) => updateConfig("value", value)}
                  options={[
                    { value: "", label: "Selecione o valor" },
                    { value: "Ativo", label: "Ativo" },
                    { value: "Dormente", label: "Dormente" },
                    { value: "Inativo", label: "Inativo" },
                  ]}
                />
              </div>
            )}

            {config.field_name === "employee_count" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor *
                </label>
                <SelectMenu
                  value={config.value || ""}
                  onChange={(value) => updateConfig("value", value)}
                  options={[
                    { value: "", label: "Selecione o valor" },
                    { value: "1-10", label: "1-10 funcionários" },
                    { value: "11-50", label: "11-50 funcionários" },
                    { value: "51-200", label: "51-200 funcionários" },
                    { value: "201-500", label: "201-500 funcionários" },
                    { value: "501-1000", label: "501-1000 funcionários" },
                    { value: "1001+", label: "1001+ funcionários" },
                  ]}
                />
              </div>
            )}

            {config.field_name === "annual_revenue" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor *
                </label>
                <SelectMenu
                  value={config.value || ""}
                  onChange={(value) => updateConfig("value", value)}
                  options={[
                    { value: "", label: "Selecione o valor" },
                    { value: "0-100K", label: "R$ 0 - 100 mil" },
                    { value: "100K-500K", label: "R$ 100 mil - 500 mil" },
                    { value: "500K-1M", label: "R$ 500 mil - 1 milhão" },
                    { value: "1M-5M", label: "R$ 1 milhão - 5 milhões" },
                    { value: "5M-10M", label: "R$ 5 milhões - 10 milhões" },
                    { value: "10M+", label: "R$ 10 milhões+" },
                  ]}
                />
              </div>
            )}

            {config.field_name && !["relationship_type", "commercial_activity", "employee_count", "annual_revenue"].includes(config.field_name) && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor *
                </label>
                <input
                  type="text"
                  value={config.value || ""}
                  onChange={(e) => updateConfig("value", e.target.value)}
                  placeholder={`Digite o valor para ${config.field_name}`}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-slate-400 dark:text-slate-400">
              <p className="mb-2">📝 <strong>Atualizar Campo do Cliente</strong></p>
              <p>Esta ação atualiza um campo do cliente vinculado ao card.</p>
              {config.field_name && (
                <p className="mt-2 text-xs">
                  Campo selecionado: <strong>{config.field_name}</strong>
                  {config.value && ` → Valor: ${config.value}`}
                </p>
              )}
            </div>
          </>
        );

      default:
        return (
          <div className="text-sm text-slate-400 dark:text-slate-400">
            Esta ação não requer configuração adicional.
          </div>
        );
    }
  };

  return (
    <div className="flex h-[calc(100vh-70px)] w-80 flex-col overflow-y-auto overflow-x-hidden border-l border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4 backdrop-blur">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{node.data.label}</h3>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-400">
            {isTrigger ? "Configurar gatilho" : "Configurar ação"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
        >
          <X size={20} className="text-slate-400 dark:text-slate-400" />
        </button>
      </div>

      {/* Alert de informação */}
      <div className="mb-6 flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <p className="text-xs text-blue-300">
          Configure os parâmetros necessários para este {isTrigger ? "gatilho" : "ação"}.
          Campos marcados com * são obrigatórios.
        </p>
      </div>

      {/* Form de configuração */}
      <div className="mb-6 flex-1 overflow-y-auto">
        {isTrigger ? renderTriggerConfig() : renderActionConfig()}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-shrink-0 gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-gray-200 dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-white transition-colors hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
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
  disabled?: boolean;
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange, disabled }) => {
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
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 dark:text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 ${
                option.value === value ? "bg-gray-100/70 dark:bg-slate-800/70" : ""
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
