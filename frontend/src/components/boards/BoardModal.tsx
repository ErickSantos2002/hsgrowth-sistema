import React, { useState, useEffect } from "react";
import { Board, CreateBoardRequest, UpdateBoardRequest } from "../../types";
import boardService from "../../services/boardService";
import { BaseModal, FormField, Input, Textarea, Select, Button, Alert } from "../common";

interface BoardModalProps {
  board?: Board | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal para criar ou editar boards na página de listagem
 * Gerencia a criação e edição de boards com validação
 */
const BoardModal: React.FC<BoardModalProps> = ({ board, onClose, onSuccess }) => {
  const isEditing = !!board;

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "⬜",
  });

  // Estado de loading e erros
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Preencher formulário ao editar
  useEffect(() => {
    if (board) {
      setFormData({
        name: board.name,
        description: board.description || "",
        color: board.color || "#3B82F6",
        icon: board.icon || "⬜",
      });
    } else {
      // Resetar ao criar novo
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "⬜",
      });
    }
    setErrors({});
  }, [board]);

  /**
   * Valida os campos do formulário
   */
  const validate = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submete o formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      if (isEditing && board) {
        // Atualizar board existente
        const updateData: UpdateBoardRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon,
        };

        await boardService.update(board.id, updateData);
      } else {
        // Criar novo board
        const createData: CreateBoardRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon,
        };

        await boardService.create(createData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar board:", error);

      // Tratar erros de validação do backend
      if (error.response?.data?.detail) {
        alert(`Erro: ${error.response.data.detail}`);
      } else {
        alert("Erro ao salvar board. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Opções de ícones disponíveis
  const iconOptions = [
    { value: "⬜", label: "Quadrado" },
    { value: "📊", label: "Gráfico" },
    { value: "🎯", label: "Alvo" },
    { value: "💼", label: "Maleta" },
    { value: "🚀", label: "Foguete" },
    { value: "📈", label: "Crescimento" },
    { value: "💡", label: "Ideia" },
    { value: "🔥", label: "Fogo" },
    { value: "⭐", label: "Estrela" },
    { value: "❤️", label: "Coração" },
  ];

  // Opções de cores predefinidas
  const colorPresets = [
    "#3B82F6", // Azul
    "#10B981", // Verde
    "#F59E0B", // Amarelo
    "#EF4444", // Vermelho
    "#8B5CF6", // Roxo
    "#EC4899", // Rosa
    "#6B7280", // Cinza
  ];

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Editar Board" : "Criar Novo Board"}
      subtitle={
        isEditing
          ? "Edite as informações do board"
          : "Crie um novo board para organizar suas listas e cards"
      }
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!formData.name.trim()}
          >
            {isEditing ? "Salvar Alterações" : "Criar Board"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alerta de sucesso planejado */}
        {!isEditing && (
          <Alert type="help">
            <strong>Dica:</strong> Após criar o board, você poderá adicionar listas e cards
            para organizar seu trabalho.
          </Alert>
        )}

        {/* Nome do board */}
        <FormField label="Nome do Board" required error={errors.name}>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Pipeline de Vendas, Projetos 2024..."
            error={!!errors.name}
            disabled={loading}
            autoFocus
          />
        </FormField>

        {/* Descrição */}
        <FormField
          label="Descrição"
          hint="Breve descrição sobre o objetivo deste board (opcional)"
        >
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Board para gerenciar todas as oportunidades de vendas..."
            rows={3}
            disabled={loading}
          />
        </FormField>

        {/* Ícone */}
        <FormField
          label="Ícone"
          hint="Escolha um ícone para identificar visualmente o board"
        >
          <div className="grid grid-cols-10 gap-2">
            {iconOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, icon: option.value })}
                disabled={loading}
                className={`aspect-square rounded-lg transition-all text-2xl flex items-center justify-center ${
                  formData.icon === option.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 bg-slate-700"
                    : "hover:scale-105 bg-slate-800/50 hover:bg-slate-700"
                }`}
                title={option.label}
                aria-label={`Selecionar ícone ${option.label}`}
              >
                {option.value}
              </button>
            ))}
          </div>
        </FormField>

        {/* Cor */}
        <FormField
          label="Cor"
          hint="Escolha uma cor principal para o board ou digite um código hex personalizado"
        >
          {/* Cores predefinidas */}
          <div className="grid grid-cols-7 gap-3 mb-3">
            {colorPresets.map((colorValue) => (
              <button
                key={colorValue}
                type="button"
                onClick={() => setFormData({ ...formData, color: colorValue })}
                disabled={loading}
                className={`w-full aspect-square rounded-lg transition-all hover:scale-105 ${
                  formData.color === colorValue
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                    : ""
                }`}
                style={{ backgroundColor: colorValue }}
                aria-label={`Selecionar cor ${colorValue}`}
              >
                {formData.color === colorValue && (
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

          {/* Input de cor customizada */}
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              disabled={loading}
              className="w-12 h-10 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer"
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="#3B82F6"
              disabled={loading}
              className="flex-1"
            />
          </div>
        </FormField>

        {/* Preview do board */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-400 mb-3">Preview:</p>
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: `${formData.color}20`,
              }}
            >
              <div className="w-8 h-8 text-2xl" style={{ color: formData.color }}>
                {formData.icon}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">
                {formData.name.trim() || "Nome do Board"}
              </h3>
              {(formData.description.trim() || !board) && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {formData.description.trim() || "Sem descrição"}
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
