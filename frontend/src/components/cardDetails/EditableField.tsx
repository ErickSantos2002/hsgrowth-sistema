import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { showError } from "../../utils/toast";

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (_value: string) => Promise<void> | void;
  type?: "text" | "number" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  format?: (_value: any) => string; // Função para formatar o valor na exibição
}

/** Delay em ms sem digitação para disparar o auto-save */
const AUTOSAVE_DELAY = 800;

/**
 * Campo editável com ícone de lápis - Tema escuro
 * Padrão de edição inline usado em toda a página.
 *
 * Auto-save: salva automaticamente 800ms após o usuário parar de digitar.
 * O onBlur também aciona o salvamento imediato quando o campo perde foco.
 * O botão Cancelar reverte para o valor original sem salvar.
 */
const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = "text",
  placeholder = "Não informado",
  disabled = false,
  icon,
  format,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Ref com o valor atual para evitar closures desatualizadas no setTimeout
  const editValueRef = useRef("");

  // Timer do debounce de auto-save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flag setada pelo botão Cancelar para impedir que o onBlur dispare um save
  const isCancellingRef = useRef(false);

  // Sincroniza o valor inicial quando o componente monta ou value muda externamente
  useEffect(() => {
    const strValue = value?.toString() || "";
    setEditValue(strValue);
    editValueRef.current = strValue;
  }, [value]);

  // Limpa o debounce ao desmontar para não salvar após o componente sair da tela
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
  };

  /**
   * Executa o salvamento. Aceita um valor opcional para evitar
   * dependência de closures potencialmente desatualizadas.
   */
  const handleSave = async (valueToSave?: string) => {
    // Garante que não há debounce pendente antes de salvar
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const val = valueToSave ?? editValueRef.current;
    setIsSaving(true);
    try {
      await onSave(val);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showError("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Cancela qualquer auto-save pendente antes de reverter
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const original = value?.toString() || "";
    setEditValue(original);
    editValueRef.current = original;
    setIsEditing(false);
  };

  /**
   * Ao digitar: atualiza o valor e (re)agenda o auto-save com debounce.
   * Cada tecla cancela o timer anterior, garantindo que apenas
   * a última pausa de 800ms dispara o salvamento.
   */
  const handleChange = (newValue: string) => {
    setEditValue(newValue);
    editValueRef.current = newValue;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSave(editValueRef.current);
    }, AUTOSAVE_DELAY);
  };

  /**
   * Ao perder o foco: salva imediatamente, a menos que o usuário
   * tenha clicado no botão Cancelar (isCancellingRef).
   */
  const handleBlur = () => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    handleSave(editValueRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      // Salva imediatamente sem aguardar o debounce
      handleSave(editValueRef.current);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Formata o valor para exibição no modo leitura
  const displayValue = value ? (format ? format(value) : value) : placeholder;

  return (
    <div className="space-y-1">
      {/* Label */}
      <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        {icon && <span className="text-slate-400 dark:text-slate-400">{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Campo editável */}
      <div className="group relative">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {/* Input de edição */}
            {type === "textarea" ? (
              <textarea
                value={editValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                rows={3}
                className="flex-1 rounded-lg border border-blue-500 bg-white/50 px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900/50 dark:text-white"
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                className="flex-1 rounded-lg border border-blue-500 bg-white/50 px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900/50 dark:text-white"
              />
            )}

            {/* Indicador de salvamento / botão salvar explícito */}
            {isSaving ? (
              <Loader2
                size={18}
                className="animate-spin text-slate-400"
                aria-label="Salvando..."
              />
            ) : (
              <button
                onClick={() => handleSave(editValueRef.current)}
                disabled={isSaving}
                className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                title="Salvar"
              >
                <Check size={16} />
              </button>
            )}

            {/* Botão cancelar — onMouseDown impede que o blur do input dispare um save */}
            <button
              onMouseDown={() => { isCancellingRef.current = true; }}
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg bg-gray-200 p-2 text-slate-600 transition-colors hover:bg-slate-600 hover:text-white disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              disabled
                ? "cursor-not-allowed border-gray-200 bg-gray-100/30 dark:border-slate-700 dark:bg-slate-800/30"
                : "cursor-pointer border-gray-200 bg-white/50 hover:border-blue-500/50 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800/50"
            } transition-colors`}
          >
            <span
              className={
                value
                  ? "text-slate-900 dark:text-white"
                  : "italic text-slate-400 dark:text-slate-500"
              }
            >
              {displayValue}
            </span>
            {!disabled && (
              <Pencil
                size={14}
                className="text-slate-400 transition-colors group-hover:text-blue-400 dark:text-slate-500"
              />
            )}
            {disabled && (
              <span className="rounded border border-gray-200 bg-gray-100/50 px-2 py-0.5 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
                Somente leitura
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableField;
