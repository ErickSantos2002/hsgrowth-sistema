import React, { useState, useEffect } from "react";
import { Board } from "../../types";
import { BaseModal, FormField, Input, Textarea, Button } from "../common";
import { COLORS } from "../../constants/colors";

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (_data: {
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
  const [color, setColor] = useState<string>(COLORS.board.blue);
  const [icon, setIcon] = useState("⬜");
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Resetar form quando abrir/fechar modal ou trocar board
  useEffect(() => {
    if (isOpen) {
      if (board) {
        setName(board.name);
        setDescription(board.description || "");
        setColor(board.color || COLORS.board.blue);
        setIcon(board.icon || "⬜");
      } else {
        setName("");
        setDescription("");
        setColor(COLORS.board.blue);
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

  // Opções de cores para o board (usando cores centralizadas)
  const colorOptions = [
    { value: COLORS.board.blue, label: "Azul" },
    { value: COLORS.board.green, label: "Verde" },
    { value: COLORS.board.amber, label: "Amarelo" },
    { value: COLORS.board.red, label: "Vermelho" },
    { value: COLORS.board.purple, label: "Roxo" },
    { value: COLORS.board.pink, label: "Rosa" },
    { value: COLORS.board.gray, label: "Cinza" },
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
        <div className="flex justify-end gap-3">
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
                className={`flex aspect-square items-center justify-center rounded-lg text-2xl transition-all ${
                  icon === iconOption
                    ? "scale-110 bg-gray-200 dark:bg-slate-700 ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                    : "bg-gray-100/50 dark:bg-slate-800/50 hover:scale-105 hover:bg-gray-200 dark:hover:bg-slate-700"
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
                className={`aspect-square w-full rounded-lg transition-all hover:scale-105 ${
                  color === option.value
                    ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                    : ""
                }`}
                style={{ backgroundColor: option.value }}
                title={option.label}
                aria-label={`Cor ${option.label}`}
              >
                {color === option.value && (
                  <svg
                    className="h-full w-full p-2 text-slate-900 dark:text-white drop-shadow-md"
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
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          <p className="mb-3 text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400">Preview:</p>
          <div className="flex items-center gap-4">
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: `${color}20`,
              }}
            >
              <div className="h-8 w-8 text-2xl" style={{ color: color }}>
                {icon}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {name.trim() || "Nome do Board"}
              </h3>
              {(description.trim() || !board) && (
                <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
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
