import React, { useState, useEffect } from "react";
import { Settings, Check, X } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import { Card, FieldDefinition, CardFieldValue } from "../../types";
import cardService from "../../services/cardService";

interface CustomFieldsSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Seção "Campos Personalizados" - Campos customizados do board
 * Seção expansível na coluna esquerda, entre Contato e Produto
 */
const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({ card, onUpdate }) => {
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<number, any>>({});
  const [editingField, setEditingField] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [loading, setLoading] = useState(false);

  // Carrega as definições de campos do board
  useEffect(() => {
    loadFieldDefinitions();
    loadFieldValues();
  }, [card]);

  /**
   * Carrega as definições de campos personalizados do board
   */
  const loadFieldDefinitions = async () => {
    try {
      // TODO: Criar endpoint no backend para buscar field_definitions por board_id
      // const fields = await fieldDefinitionService.getByBoardId(card.board_id);
      // setFieldDefinitions(fields);

      // Mock: Campos personalizados de exemplo
      const mockFields: FieldDefinition[] = [
        {
          id: 1,
          board_id: card.board_id || 1,
          name: "Segmento",
          field_type: "select",
          options: ["Tecnologia", "Saúde", "Educação", "Varejo", "Serviços"],
          is_required: true,
          position: 1,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          board_id: card.board_id || 1,
          name: "Número de Funcionários",
          field_type: "number",
          options: null,
          is_required: false,
          position: 2,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          board_id: card.board_id || 1,
          name: "Data de Primeira Reunião",
          field_type: "date",
          options: null,
          is_required: false,
          position: 3,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 4,
          board_id: card.board_id || 1,
          name: "Website da Empresa",
          field_type: "url",
          options: null,
          is_required: false,
          position: 4,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 5,
          board_id: card.board_id || 1,
          name: "Interesses",
          field_type: "multiselect",
          options: ["CRM", "ERP", "BI", "Automação", "Integração"],
          is_required: false,
          position: 5,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 6,
          board_id: card.board_id || 1,
          name: "Contrato Assinado",
          field_type: "boolean",
          options: null,
          is_required: false,
          position: 6,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setFieldDefinitions(mockFields);
    } catch (error) {
      console.error("Erro ao carregar campos personalizados:", error);
    }
  };

  /**
   * Carrega os valores dos campos para este card
   */
  const loadFieldValues = () => {
    // TODO: Backend deve retornar field_values junto com o card
    // Por enquanto, vamos usar valores mockados ou vazios
    const mockValues: Record<number, any> = {
      1: "Tecnologia",
      2: 50,
      3: "2026-01-20",
      4: "https://www.empresa.com.br",
      5: ["CRM", "BI"],
      6: false,
    };

    setFieldValues(mockValues);
  };

  /**
   * Inicia edição de um campo
   */
  const handleStartEdit = (fieldId: number, currentValue: any) => {
    setEditingField(fieldId);
    setEditValue(currentValue || "");
  };

  /**
   * Salva valor do campo
   */
  const handleSaveField = async (fieldId: number) => {
    try {
      setLoading(true);

      // TODO: Integrar com backend
      // await cardFieldValueService.upsert({
      //   card_id: card.id,
      //   field_definition_id: fieldId,
      //   value: editValue,
      // });

      // Atualiza localmente
      setFieldValues({ ...fieldValues, [fieldId]: editValue });
      setEditingField(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar campo:", error);
      alert("Erro ao salvar campo");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela edição
   */
  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  /**
   * Renderiza campo conforme o tipo
   */
  const renderFieldInput = (field: FieldDefinition) => {
    const value = fieldValues[field.id];
    const isEditing = editingField === field.id;

    // Modo de visualização
    if (!isEditing) {
      return (
        <div
          onClick={() => handleStartEdit(field.id, value)}
          className="flex items-center justify-between px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
        >
          <span className={value ? "text-white" : "text-slate-500 italic"}>
            {formatDisplayValue(field, value)}
          </span>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
            {field.is_required ? "Obrigatório" : "Opcional"}
          </span>
        </div>
      );
    }

    // Modo de edição
    return (
      <div className="space-y-2">
        {renderInputByType(field)}

        {/* Botões de ação */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSaveField(field.id)}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Check size={14} />
            Salvar
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors"
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  /**
   * Renderiza input conforme tipo de campo
   */
  const renderInputByType = (field: FieldDefinition) => {
    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <input
            type={field.field_type === "text" ? "text" : field.field_type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "select":
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "multiselect":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(editValue) && editValue.includes(option)}
                  onChange={(e) => {
                    const currentArray = Array.isArray(editValue) ? editValue : [];
                    if (e.target.checked) {
                      setEditValue([...currentArray, option]);
                    } else {
                      setEditValue(currentArray.filter((v: string) => v !== option));
                    }
                  }}
                  className="w-4 h-4 rounded bg-slate-900/50 border-slate-700"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!editValue}
              onChange={(e) => setEditValue(e.target.checked)}
              autoFocus
              className="w-5 h-5 rounded bg-slate-900/50 border-slate-700"
            />
            <span className="text-sm text-slate-300">
              {editValue ? "Sim" : "Não"}
            </span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
    }
  };

  /**
   * Formata valor para exibição
   */
  const formatDisplayValue = (field: FieldDefinition, value: any) => {
    if (!value && value !== 0 && value !== false) return "Não preenchido";

    switch (field.field_type) {
      case "date":
        return new Date(value).toLocaleDateString("pt-BR");

      case "boolean":
        return value ? "Sim" : "Não";

      case "multiselect":
        return Array.isArray(value) ? value.join(", ") : "Nenhum selecionado";

      case "url":
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );

      case "email":
        return (
          <a
            href={`mailto:${value}`}
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );

      case "phone":
        return value;

      default:
        return value;
    }
  };

  if (fieldDefinitions.length === 0) {
    return null; // Não mostra a seção se não há campos personalizados
  }

  return (
    <ExpandableSection
      title="Campos Personalizados"
      defaultExpanded={false}
      icon={<Settings size={18} />}
      badge={fieldDefinitions.filter((f) => f.is_required).length > 0 ? "!" : undefined}
    >
      <div className="space-y-4">
        {fieldDefinitions.map((field) => (
          <div key={field.id} className="space-y-1">
            {/* Label do campo */}
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <span>{field.name}</span>
              {field.is_required && <span className="text-red-400">*</span>}
            </div>

            {/* Input do campo */}
            {renderFieldInput(field)}
          </div>
        ))}

        {/* Aviso sobre dados mockados */}
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 italic">
            Nota: Campos personalizados mockados. A integração com backend será implementada.
          </p>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default CustomFieldsSection;
