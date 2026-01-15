import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Grid3x3,
  Target,
  TrendingUp,
  Users,
  Briefcase,
  FolderKanban,
  Lightbulb,
  Rocket,
  Star,
  Heart,
  LucideIcon,
} from "lucide-react";
import { Board, CreateBoardRequest, UpdateBoardRequest } from "../../types";
import boardService from "../../services/boardService";
import { BaseModal, FormField, Input, Textarea, Button, Alert } from "../common";

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
    icon: "grid",
  });

  // Estado de loading e erros
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isIconOpen, setIsIconOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);
  const allowedIcons = new Set([
    "grid",
    "target",
    "trending-up",
    "users",
    "briefcase",
    "folder-kanban",
    "lightbulb",
    "rocket",
    "star",
    "heart",
  ]);
  const normalizeIcon = (value?: string) => (value && allowedIcons.has(value) ? value : "grid");

  // Preencher formulário ao editar
  useEffect(() => {
    if (board) {
      setFormData({
        name: board.name,
        description: board.description || "",
        color: board.color || "#3B82F6",
        icon: normalizeIcon(board.icon),
      });
    } else {
      // Resetar ao criar novo
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "grid",
      });
    }
    setErrors({});
  }, [board]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setIsIconOpen(false);
      }
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setIsColorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const iconOptions: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "grid", label: "Grid", icon: Grid3x3 },
    { value: "target", label: "Alvo", icon: Target },
    { value: "trending-up", label: "Crescimento", icon: TrendingUp },
    { value: "users", label: "Usuarios", icon: Users },
    { value: "briefcase", label: "Maleta", icon: Briefcase },
    { value: "folder-kanban", label: "Kanban", icon: FolderKanban },
    { value: "lightbulb", label: "Ideia", icon: Lightbulb },
    { value: "rocket", label: "Foguete", icon: Rocket },
    { value: "star", label: "Estrela", icon: Star },
    { value: "heart", label: "Coracao", icon: Heart },
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
  const selectedIconOption =
    iconOptions.find((option) => option.value === formData.icon) || iconOptions[0];
  const SelectedIcon = selectedIconOption.icon;

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
          hint="Breve descrição sobre o objetivo deste board (opcional, até 200 caracteres)"
        >
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Board para gerenciar todas as oportunidades de vendas..."
            rows={3}
            disabled={loading}
            maxLength={200}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ícone */}
          <FormField
            label="Ícone"
            hint="Clique para escolher um ícone do board"
          >
            <div ref={iconRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsIconOpen((open) => !open);
                  setIsColorOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isIconOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="text-slate-200">
                    <SelectedIcon size={20} />
                  </span>
                  <span className="text-sm">{selectedIconOption.label}</span>
                </span>
                <ChevronDown size={18} className="text-slate-400" />
              </button>

              {isIconOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
                  <div className="grid grid-cols-5 gap-2">
                    {iconOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, icon: option.value });
                          setIsIconOpen(false);
                        }}
                        disabled={loading}
                        className={`aspect-square rounded-lg transition-all text-2xl flex items-center justify-center ${
                          formData.icon === option.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 bg-slate-700"
                            : "hover:scale-105 bg-slate-800/50 hover:bg-slate-700"
                        }`}
                        title={option.label}
                        aria-label={`Selecionar ícone ${option.label}`}
                      >
                        <option.icon size={22} className="text-slate-200" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormField>

          {/* Cor */}
          <FormField
            label="Cor"
            hint="Clique para escolher uma cor predefinida"
          >
            <div ref={colorRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsColorOpen((open) => !open);
                  setIsIconOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isColorOpen}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-md border border-slate-600"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm">{formData.color}</span>
                </span>
                <ChevronDown size={18} className="text-slate-400" />
              </button>

              {isColorOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
                  <div className="grid grid-cols-7 gap-2">
                    {colorPresets.map((colorValue) => (
                      <button
                        key={colorValue}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, color: colorValue });
                          setIsColorOpen(false);
                        }}
                        disabled={loading}
                        className={`aspect-square rounded-lg transition-all hover:scale-105 ${
                          formData.color === colorValue
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105"
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
                  <div className="mt-3 flex gap-2">
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
                </div>
              )}
            </div>
          </FormField>
        </div>

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
              <SelectedIcon size={28} style={{ color: formData.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">
                {formData.name.trim() || "Nome do Board"}
              </h3>
              {(formData.description.trim() || !board) && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {(formData.description.trim() || "Sem descrição").slice(0, 200)}
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
