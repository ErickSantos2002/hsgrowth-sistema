import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Board } from "../../types";

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; color: string; icon: string }) => void;
  board?: Board | null;
  title: string;
}

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

  useEffect(() => {
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
  }, [board, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon
    });
    onClose();
  };

  if (!isOpen) return null;

  const colorOptions = [
    { value: "#3B82F6", label: "Azul" },
    { value: "#10B981", label: "Verde" },
    { value: "#F59E0B", label: "Amarelo" },
    { value: "#EF4444", label: "Vermelho" },
    { value: "#8B5CF6", label: "Roxo" },
    { value: "#EC4899", label: "Rosa" },
    { value: "#6B7280", label: "Cinza" },
  ];

  const iconOptions = ["⬜", "📊", "🎯", "💼", "🚀", "📈", "💡", "🔥"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do board */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Board
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pipeline de Vendas, Projetos 2024..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do board..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Ícone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ícone
            </label>
            <div className="grid grid-cols-8 gap-2">
              {iconOptions.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  onClick={() => setIcon(iconOption)}
                  className={`w-10 h-10 rounded-lg transition-all text-2xl flex items-center justify-center ${
                    icon === iconOption
                      ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110 bg-gray-700"
                      : "hover:scale-105 bg-gray-700/50"
                  }`}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          {/* Cor do board */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cor
            </label>
            <div className="grid grid-cols-7 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === option.value
                      ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: option.value }}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {board ? "Salvar" : "Criar Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardModal;
