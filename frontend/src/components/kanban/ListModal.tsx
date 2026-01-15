import React, { useState, useEffect } from "react";
import { List } from "../../types";
import { BaseModal, FormField, Input, Button } from "../common";

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string }) => void;
  list?: List | null;
  title: string;
}

/**
 * Modal para criar ou editar listas do Kanban
 * Permite definir nome e cor da lista
 */
const ListModal: React.FC<ListModalProps> = ({
  isOpen,
  onClose,
  onSave,
  list,
  title,
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Resetar form quando abrir/fechar modal ou trocar lista
  useEffect(() => {
    if (isOpen) {
      if (list) {
        setName(list.name);
        setColor(list.color || "#3B82F6");
      } else {
        setName("");
        setColor("#3B82F6");
      }
      setErrors({});
    }
  }, [list, isOpen]);

  /**
   * Valida o formulário antes de salvar
   */
  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Nome da lista é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler do submit do formulário
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({ name: name.trim(), color });
    onClose();
  };

  // Opções de cores para as listas
  const colorOptions = [
    { value: "#3B82F6", label: "Azul" },
    { value: "#10B981", label: "Verde" },
    { value: "#F59E0B", label: "Amarelo" },
    { value: "#EF4444", label: "Vermelho" },
    { value: "#8B5CF6", label: "Roxo" },
    { value: "#EC4899", label: "Rosa" },
    { value: "#6B7280", label: "Cinza" },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={list ? "Edite as informações da lista" : "Crie uma nova lista para organizar seus cards"}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {list ? "Salvar Alterações" : "Criar Lista"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome da lista */}
        <FormField label="Nome da Lista" required error={errors.name}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Novos Leads, Em Negociação, Fechados..."
            error={!!errors.name}
            autoFocus
          />
        </FormField>

        {/* Cor da lista */}
        <FormField
          label="Cor da Lista"
          hint="Escolha uma cor para identificar visualmente a lista"
        >
          <div className="grid grid-cols-7 gap-3">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={`w-full aspect-square rounded-lg transition-all hover:scale-105 ${
                  color === option.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                    : ""
                }`}
                style={{ backgroundColor: option.value }}
                title={option.label}
                aria-label={`Cor ${option.label}`}
              >
                {color === option.value && (
                  <svg
                    className="w-full h-full p-2 text-white drop-shadow-md"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </FormField>

        {/* Preview da cor selecionada */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Preview:</p>
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-white font-medium">
              {name.trim() || "Nome da Lista"}
            </span>
            <span className="ml-auto px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded-full">
              0 cards
            </span>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default ListModal;
