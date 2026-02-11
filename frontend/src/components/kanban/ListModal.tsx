import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { List } from "../../types";
import { BaseModal, FormField, Input, Button } from "../common";
import { COLORS } from "../../constants/colors";

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (_data: { name: string; color: string }) => void;
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
  const [color, setColor] = useState(COLORS.board.blue);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isColorOpen, setIsColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement | null>(null);

  // Resetar form quando abrir/fechar modal ou trocar lista
  useEffect(() => {
    if (isOpen) {
      if (list) {
        setName(list.name);
        setColor(list.color || COLORS.board.blue);
      } else {
        setName("");
        setColor(COLORS.board.blue);
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

  // Opções de cores para as listas (usando cores centralizadas)
  const colorOptions = [
    { value: COLORS.board.blue, label: "Azul" },
    { value: COLORS.board.green, label: "Verde" },
    { value: COLORS.board.amber, label: "Amarelo" },
    { value: COLORS.board.red, label: "Vermelho" },
    { value: COLORS.board.purple, label: "Roxo" },
    { value: COLORS.board.pink, label: "Rosa" },
    { value: COLORS.board.gray, label: "Cinza" },
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
        <div className="flex justify-end gap-3">
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
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-slate-200 transition-colors hover:bg-slate-700"
              aria-haspopup="listbox"
              aria-expanded={isColorOpen}
            >
              <span className="flex items-center gap-3">
                <span
                  className="h-6 w-6 rounded-md border border-slate-600"
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
                          ? "scale-105 ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                          : ""
                      }`}
                      style={{ backgroundColor: colorValue }}
                      aria-label={`Selecionar cor ${colorValue}`}
                    >
                      {color === colorValue && (
                        <svg
                          className="h-full w-full p-2 text-white drop-shadow-md"
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
                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-600 bg-slate-800"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder={COLORS.board.blue}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        </FormField>

        {/* Preview da lista */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <p className="mb-3 text-xs font-medium text-slate-400">Preview:</p>
          <div
            className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4"
            style={{
              borderColor: `${color}50`,
              backgroundColor: `${color}14`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-1 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <h4 className="font-semibold text-white">
                  {name.trim() || "Nome da Lista"}
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">Lista de cards</p>
              </div>
              <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-xs text-slate-400">
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
