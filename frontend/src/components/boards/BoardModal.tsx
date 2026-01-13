import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Board, CreateBoardRequest, UpdateBoardRequest } from "../../types";
import boardService from "../../services/boardService";

interface BoardModalProps {
  board?: Board | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BoardModal: React.FC<BoardModalProps> = ({ board, onClose, onSuccess }) => {
  const isEditing = !!board;

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Estado de loading e erros
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preencher formulário ao editar
  useEffect(() => {
    if (board) {
      setFormData({
        name: board.name,
        description: board.description || "",
      });
    }
  }, [board]);

  /**
   * Atualiza os campos do formulário
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Valida os campos do formulário
   */
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (formData.name.length < 3) {
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
        };

        await boardService.update(board.id, updateData);
        alert("Board atualizado com sucesso!"); // TODO: Adicionar toast
      } else {
        // Criar novo board
        const createData: CreateBoardRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        };

        await boardService.create(createData);
        alert("Board criado com sucesso!"); // TODO: Adicionar toast
      }

      onSuccess();
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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? "Editar Board" : "Criar Novo Board"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Board <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Pipeline de Vendas"
                className={`w-full px-4 py-2 bg-gray-900/50 border ${
                  errors.name ? "border-red-500" : "border-gray-700"
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreva o propósito deste board..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                disabled={loading}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default BoardModal;
