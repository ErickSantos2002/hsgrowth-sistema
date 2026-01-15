import React, { useState, useEffect } from "react";
import { Board } from "../../types";
import { BaseModal, FormField, Input, Textarea, Button } from "../common";

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    color: string;
    icon: string;
  }) => void;
  board?: Board | null;
  title: string;
}

/**
 * Modal para criar ou editar boards
 * Permite definir nome, descrição, cor e ícone
 */
const BoardModal: React.FC<BoardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  board,
  title,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [icon, setIcon] = useState("⬜");
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Resetar form quando abrir/fechar modal ou trocar board
  useEffect(() => {
    if (isOpen) {
      if (board) {
        setName(board.name);
        setDescription(board.description || "");
        setColor(board.color || "#3B82F6");
        setIcon(board.icon || "⬜");
      } else {
        setName("");
        setDescription("");
        setColor("#3B82F6");
        setIcon("⬜");
      }
      setErrors({});
    }
  }, [board, isOpen]);

  /**
   * Valida o formulário antes de salvar
   */
  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Nome do board é obrigatório";
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

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon,
    });
    onClose();
  };

  // Opções de cores para o board
  const colorOptions = [
    { value: "#3B82F6", label: "Azul" },
    { value: "#10B981", label: "Verde" },
    { value: "#F59E0B", label: "Amarelo" },
    { value: "#EF4444", label: "Vermelho" },
    { value: "#8B5CF6", label: "Roxo" },
    { value: "#EC4899", label: "Rosa" },
    { value: "#6B7280", label: "Cinza" },
  ];

  // Opções de ícones para o board
  const iconOptions = ["⬜", "📊", "🎯", "💼", "🚀", "📈", "💡", "🔥"];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={
        board
          ? "Edite as informações do board"
          : "Crie um novo board para organizar suas listas e cards"
      }
      size="lg"
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
            {board ? "Salvar Alterações" : "Criar Board"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome do board */}
        <FormField label="Nome do Board" required error={errors.name}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pipeline de Vendas, Projetos 2024..."
            error={!!errors.name}
            autoFocus
          />
        </FormField>

        {/* Descrição */}
        <FormField
          label="Descrição"
          hint="Breve descrição sobre o objetivo deste board (opcional)"
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Board para gerenciar todas as oportunidades de vendas..."
            rows={3}
          />
        </FormField>

        {/* Ícone */}
        <FormField
          label="Ícone"
          hint="Escolha um ícone para identificar visualmente o board"
        >
          <div className="grid grid-cols-8 gap-3">
            {iconOptions.map((iconOption) => (
              <button
                key={iconOption}
                type="button"
                onClick={() => setIcon(iconOption)}
                className={`aspect-square rounded-lg transition-all text-2xl flex items-center justify-center ${
                  icon === iconOption
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 bg-slate-700"
                    : "hover:scale-105 bg-slate-800/50 hover:bg-slate-700"
                }`}
                title={`Ícone ${iconOption}`}
                aria-label={`Selecionar ícone ${iconOption}`}
              >
                {iconOption}
              </button>
            ))}
          </div>
        </FormField>

        {/* Cor */}
        <FormField
          label="Cor"
          hint="Escolha uma cor principal para o board"
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

        {/* Preview do board */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-400 mb-3">Preview:</p>
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: `${color}20`,
              }}
            >
              <div className="w-8 h-8 text-2xl" style={{ color: color }}>
                {icon}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">
                {name.trim() || "Nome do Board"}
              </h3>
              {(description.trim() || !board) && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {description.trim() || "Sem descrição"}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default BoardModal;
