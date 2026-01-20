import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
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
  const [isColorOpen, setIsColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setIsColorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const colorPresets = colorOptions.map((option) => option.value);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={list ? "Edite as informações da lista" : "Crie uma nova lista para organizar seus cards"}
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
          hint="Clique para escolher uma cor predefinida"
        >
          <div ref={colorRef} className="relative">
            <button
              type="button"
              onClick={() => setIsColorOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700 transition-colors"
              aria-haspopup="listbox"
              aria-expanded={isColorOpen}
            >
              <span className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-md border border-slate-600"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm">{color}</span>
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
                        setColor(colorValue);
                        setIsColorOpen(false);
                      }}
                      className={`aspect-square rounded-lg transition-all hover:scale-105 ${
                        color === colorValue
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105"
                          : ""
                      }`}
                      style={{ backgroundColor: colorValue }}
                      aria-label={`Selecionar cor ${colorValue}`}
                    >
                      {color === colorValue && (
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
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        </FormField>

        {/* Preview da lista */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-400 mb-3">Preview:</p>
          <div
            className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4"
            style={{
              borderColor: `${color}50`,
              backgroundColor: `${color}14`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <h4 className="text-white font-semibold">
                  {name.trim() || "Nome da Lista"}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Lista de cards</p>
              </div>
              <span className="px-2 py-0.5 bg-slate-800/70 text-slate-400 text-xs rounded-full">
                0 cards
              </span>
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default ListModal;
