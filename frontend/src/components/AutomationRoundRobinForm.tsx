import React, { useState, useEffect, useRef, useCallback } from "react";
import { List, Zap, ChevronDown } from "lucide-react";
import BaseModal from "./common/BaseModal";
import { FormField, Input, Textarea, Button } from "./common";
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
  isOpen?: boolean;
}

const AutomationRoundRobinForm: React.FC<AutomationRoundRobinFormProps> = ({
  onClose,
  onSuccess,
  automation,
  isOpen = true,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!automation;

  const getInitialFormData = useCallback(() => ({
    name: automation?.name || "",
    description: automation?.description || "",
    board_id: automation?.board_id ? String(automation.board_id) : "",
    target_list_id: automation?.trigger_conditions?.to_list_id
      ? String(automation.trigger_conditions.to_list_id)
      : "",
    is_active: automation?.is_active !== undefined ? automation.is_active : true,
  }), [automation]);

  const [formData, setFormData] = useState(() => getInitialFormData());

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (formData.board_id) {
      loadLists(Number(formData.board_id));
    } else {
      setLists([]);
    }
  }, [formData.board_id]);

  useEffect(() => {
    setFormData(getInitialFormData());
    setError(null);
  }, [automation, isOpen, getInitialFormData]);

  const loadBoards = async () => {
    try {
      const response = await boardService.list();
      setBoards(response.boards || []);
    } catch (err) {
      console.error("Erro ao carregar boards:", err);
    }
  };

  const loadLists = async (boardId: number) => {
    try {
      setLoadingLists(true);
      const response = await boardService.getLists(boardId);
      setLists(response || []);
    } catch (err) {
      console.error("Erro ao carregar listas:", err);
      setLists([]);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleBoardChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      board_id: value,
      target_list_id: "",
    }));
    setError(null);
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }

    if (!formData.board_id) {
      setError("Board é obrigatório");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      let triggerConditions = null;
      if (formData.target_list_id) {
        triggerConditions = {
          to_list_id: Number(formData.target_list_id),
        };
      }

      const automationData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        board_id: Number(formData.board_id),
        automation_type: "trigger",
        trigger_event: "card_moved",
        trigger_conditions: triggerConditions,
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
    } catch (err: any) {
      console.error("Erro ao salvar automação:", err);
      const message = err?.response?.data?.detail || "Erro ao salvar automação. Verifique os dados e tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const listHint = !formData.board_id
    ? "Selecione um board para carregar as listas"
    : formData.target_list_id
    ? "Quando um card chegar nesta lista, será automaticamente atribuído ao próximo vendedor"
    : "Quando qualquer card for movido no board, será automaticamente atribuído ao próximo vendedor";

  const boardOptions = [
    { value: "", label: "Selecione um board" },
    ...boards.map((board) => ({ value: String(board.id), label: board.name })),
  ];

  const listOptions = [
    {
      value: "",
      label: loadingLists
        ? "Carregando listas..."
        : !formData.board_id
        ? "Selecione um board primeiro"
        : "Todas as listas do board",
    },
    ...lists.map((list) => ({ value: String(list.id), label: list.name })),
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Automação" : "Nova Automação"}
      subtitle={
        isEditing
          ? "Atualize os dados da automação de rodízio"
          : "Configure o rodízio de vendedores para distribuição automática"
      }
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div>{error && <p className="text-sm text-red-400">{error}</p>}</div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>
              {isEditing ? "Salvar Alterações" : "Criar Automação"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Seção: Dados da Automação */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Zap size={20} className="text-emerald-400" />
            Dados da Automação
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nome da Automação" required className="md:col-span-2">
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Rodízio RD - Atribuir Vendedor"
                autoFocus
              />
            </FormField>

            <FormField label="Descrição" hint="Descreva o que essa automação faz" className="md:col-span-2">
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descreva o que essa automação faz..."
                rows={4}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Configuração do Trigger */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <List size={20} className="text-emerald-400" />
            Configuração do Trigger
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Board"
              required
              hint="Board onde a automação será aplicada"
              className="md:col-span-2"
            >
              <SelectMenu value={formData.board_id} options={boardOptions} onChange={handleBoardChange} />
            </FormField>

            <FormField
              label="Lista de Destino (trigger)"
              hint={listHint}
              className="md:col-span-2"
            >
              <SelectMenu
                value={formData.target_list_id}
                options={listOptions}
                onChange={(value) => handleChange("target_list_id", value)}
                disabled={!formData.board_id || loadingLists}
              />
            </FormField>
          </div>
        </div>

        {/* Seção: Status */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">Status</h3>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="cursor-pointer text-sm text-slate-300">
              Automação ativa (começar a executar imediatamente)
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex gap-3">
            <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div className="text-sm text-emerald-200">
              <p className="mb-1 font-medium">Como funciona:</p>
              <ul className="space-y-1 text-emerald-300">
                <li>• Escolha uma lista específica ou deixe vazio para aplicar em todas as listas</li>
                <li>• Cards movidos serão distribuídos automaticamente em rodízio</li>
                <li>• Apenas vendedores ativos participam do rodízio</li>
                <li>• O sistema garante distribuição equilibrada entre todos os vendedores</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default AutomationRoundRobinForm;

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
  disabled?: boolean;
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

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
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
