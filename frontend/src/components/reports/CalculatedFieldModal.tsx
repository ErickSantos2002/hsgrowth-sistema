/**
 * Modal para criar e editar campos calculados (fórmulas DAX-like).
 *
 * Funcionalidades:
 *  - Autocomplete de [field_key] ao digitar "[" no textarea
 *  - Validação local imediata (parênteses, chars permitidos, keys válidas)
 *  - Validação via API com debounce de 500ms
 *  - Feedback visual (borda verde/vermelha no textarea)
 *  - Botão Salvar desabilitado enquanto fórmula inválida
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { CalculatedField, FieldDefinition, DataSource } from './reportTypes';
import reportService from '../../services/reportService';

interface CalculatedFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o campo salvo (novo ou editado) */
  onSave: (field: CalculatedField) => void;
  /** Preenchido quando o usuário está editando um campo existente */
  editingField?: CalculatedField | null;
  /** Fonte de dados à qual os campos da fórmula pertencem */
  allowedSource: DataSource;
  /** Campos agregáveis disponíveis para autocomplete */
  availableMetrics: FieldDefinition[];
}

/** Estado de validação da fórmula */
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/** Verifica se parênteses estão balanceados */
function hasBalancedParens(formula: string): boolean {
  let depth = 0;
  for (const ch of formula) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/** Extrai todos os [field_key] da fórmula */
function extractFieldRefs(formula: string): string[] {
  const matches = formula.match(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

/** Valida localmente sem chamar a API */
function validateLocal(formula: string, availableKeys: string[]): string[] {
  const errors: string[] = [];

  if (!formula.trim()) {
    errors.push('A fórmula não pode estar vazia.');
    return errors;
  }

  // Verifica caracteres permitidos
  if (!/^[\w\s[\]+\-*/().]+$/.test(formula)) {
    errors.push('A fórmula contém caracteres inválidos. Use apenas letras, números, [campo] e operadores + - * /.');
  }

  // Verifica parênteses balanceados
  if (!hasBalancedParens(formula)) {
    errors.push('Parênteses não estão balanceados.');
  }

  // Verifica que todas as referências [campo] são keys válidas
  const refs = extractFieldRefs(formula);
  for (const ref of refs) {
    if (!availableKeys.includes(ref)) {
      errors.push(`Campo '[${ref}]' não encontrado. Use o autocomplete para inserir campos válidos.`);
    }
  }

  return errors;
}

const CalculatedFieldModal: React.FC<CalculatedFieldModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingField,
  allowedSource,
  availableMetrics,
}) => {
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [fieldType, setFieldType] = useState<'number' | 'currency'>('number');

  /** Estado de validação e mensagens de erro */
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /** Controle do dropdown de autocomplete */
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState('');
  /** Posição do cursor no momento em que o "[" foi digitado */
  const [bracketPos, setBracketPos] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const apiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Keys disponíveis para autocomplete e validação */
  const availableKeys = availableMetrics
    .filter((f) => f.aggregatable)
    .map((f) => f.key);

  // ========================
  // Preenche o formulário ao editar um campo existente
  // ========================

  useEffect(() => {
    if (!isOpen) return;

    if (editingField) {
      setName(editingField.name);
      setFormula(editingField.formula);
      setFieldType(editingField.field_type);
    } else {
      setName('');
      setFormula('');
      setFieldType('number');
    }

    setValidationState('idle');
    setValidationErrors([]);
    setAutocompleteOpen(false);
  }, [isOpen, editingField]);

  // ========================
  // Fecha o autocomplete ao clicar fora
  // ========================

  useEffect(() => {
    if (!autocompleteOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setAutocompleteOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autocompleteOpen]);

  // ========================
  // Validação com debounce 500ms
  // ========================

  const triggerApiValidation = useCallback(
    (currentFormula: string) => {
      if (apiDebounceRef.current) clearTimeout(apiDebounceRef.current);

      // Erros locais já detectados — não precisa chamar API
      const localErrors = validateLocal(currentFormula, availableKeys);
      if (localErrors.length > 0) {
        setValidationState('invalid');
        setValidationErrors(localErrors);
        return;
      }

      setValidationState('validating');

      apiDebounceRef.current = setTimeout(async () => {
        try {
          const result = await reportService.validateFormula(
            currentFormula,
            allowedSource,
            availableKeys
          );

          setValidationState(result.is_valid ? 'valid' : 'invalid');
          setValidationErrors(result.errors);
        } catch {
          // Em caso de falha na API, mantém os erros locais como feedback
          setValidationState('invalid');
          setValidationErrors(['Não foi possível validar a fórmula no servidor.']);
        }
      }, 500);
    },
    [allowedSource, availableKeys]
  );

  // ========================
  // Handler do textarea
  // ========================

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setFormula(newValue);
    triggerApiValidation(newValue);
  };

  const handleFormulaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Abre o autocomplete ao digitar "["
    if (e.key === '[') {
      const pos = textarea.selectionStart;
      setBracketPos(pos + 1); // +1 porque o "[" ainda não foi inserido no value
      setAutocompleteFilter('');
      setAutocompleteOpen(true);
      return;
    }

    if (!autocompleteOpen) return;

    // Navega/fecha o dropdown com teclas especiais
    if (e.key === 'Escape') {
      e.preventDefault();
      setAutocompleteOpen(false);
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const filtered = getFilteredMetrics();
      if (filtered.length > 0) {
        e.preventDefault();
        insertFieldRef(filtered[0].key);
      }
      return;
    }

    // Atualiza o filtro ao continuar digitando após o "["
    if (e.key.length === 1 && /[a-zA-Z0-9_]/.test(e.key)) {
      setAutocompleteFilter((prev) => prev + e.key);
    } else if (e.key === 'Backspace') {
      if (autocompleteFilter.length > 0) {
        setAutocompleteFilter((prev) => prev.slice(0, -1));
      } else {
        // Usuário deletou o "[" — fecha o dropdown
        setAutocompleteOpen(false);
      }
    }
  };

  /** Insere [field_key] no cursor, substituindo o "[" + texto digitado até agora */
  const insertFieldRef = (fieldKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea || bracketPos === null) return;

    // bracketPos aponta para após o "["; o cursor atual é bracketPos + autocompleteFilter.length
    const insertStart = bracketPos - 1; // inclui o "["
    const insertEnd = bracketPos + autocompleteFilter.length;

    const before = formula.slice(0, insertStart);
    const after = formula.slice(insertEnd);
    const newFormula = `${before}[${fieldKey}]${after}`;

    setFormula(newFormula);
    setAutocompleteOpen(false);
    setAutocompleteFilter('');
    setBracketPos(null);

    // Posiciona o cursor logo após o "]" inserido
    const newCursorPos = insertStart + fieldKey.length + 2; // "[" + key + "]"
    requestAnimationFrame(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });

    // Revalida com a nova fórmula
    triggerApiValidation(newFormula);
  };

  const getFilteredMetrics = (): FieldDefinition[] => {
    if (!autocompleteFilter) return availableMetrics.filter((f) => f.aggregatable);
    const lower = autocompleteFilter.toLowerCase();
    return availableMetrics.filter(
      (f) => f.aggregatable && (f.key.toLowerCase().includes(lower) || f.label.toLowerCase().includes(lower))
    );
  };

  // ========================
  // Submit
  // ========================

  const handleSave = () => {
    if (!name.trim()) return;
    if (validationState !== 'valid') return;

    const field: CalculatedField = {
      id: editingField?.id ?? crypto.randomUUID(),
      name: name.trim(),
      formula: formula.trim(),
      source: allowedSource,
      field_type: fieldType,
    };

    onSave(field);
    onClose();
  };

  // ========================
  // Estado visual do textarea
  // ========================

  const textareaClass = [
    'w-full resize-none rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-400',
    'focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500',
    validationState === 'valid'
      ? 'border-emerald-400 focus:ring-emerald-500/30 dark:border-emerald-500'
      : validationState === 'invalid'
        ? 'border-red-400 focus:ring-red-500/30 dark:border-red-500'
        : 'border-gray-300 focus:ring-emerald-500/30 dark:border-slate-600',
  ].join(' ');

  const canSave =
    name.trim().length > 0 &&
    formula.trim().length > 0 &&
    validationState === 'valid';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {editingField ? 'Editar Campo Calculado' : 'Novo Campo Calculado'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Combine métricas com operações aritméticas (+, -, *, /)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <div className="space-y-5 px-6 py-5">
          {/* Nome do campo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Taxa de Conversão (%)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Tipo do resultado */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Tipo do resultado
            </label>
            <div className="flex gap-2">
              {(['number', 'currency'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFieldType(type)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    fieldType === type
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-slate-500 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {type === 'number' ? 'Número' : 'Moeda (R$)'}
                </button>
              ))}
            </div>
          </div>

          {/* Fórmula com autocomplete */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Fórmula
              <span className="ml-1.5 font-normal text-slate-400">
                — digite <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-700">[</kbd> para inserir um campo
              </span>
            </label>

            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={3}
                value={formula}
                onChange={handleFormulaChange}
                onKeyDown={handleFormulaKeyDown}
                placeholder="Ex: [won_count] / [count] * 100"
                spellCheck={false}
                className={textareaClass}
              />

              {/* Ícone de status de validação */}
              {validationState === 'valid' && (
                <CheckCircle
                  size={14}
                  className="absolute right-2.5 top-2.5 text-emerald-500"
                />
              )}
              {validationState === 'invalid' && (
                <AlertCircle
                  size={14}
                  className="absolute right-2.5 top-2.5 text-red-500"
                />
              )}
              {validationState === 'validating' && (
                <div className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
              )}

              {/* Dropdown de autocomplete */}
              {autocompleteOpen && getFilteredMetrics().length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  {getFilteredMetrics().map((metric) => (
                    <button
                      key={metric.key}
                      type="button"
                      onMouseDown={(e) => {
                        // onMouseDown em vez de onClick para não perder o foco do textarea
                        e.preventDefault();
                        insertFieldRef(metric.key);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <code className="shrink-0 font-mono text-blue-600 dark:text-blue-400">
                        [{metric.key}]
                      </code>
                      <span className="text-slate-500 dark:text-slate-400">
                        — {metric.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Erros de validação */}
            {validationErrors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={11} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Dica de campos disponíveis */}
            {validationState === 'idle' && availableMetrics.filter((f) => f.aggregatable).length > 0 && (
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Campos disponíveis:{' '}
                {availableMetrics
                  .filter((f) => f.aggregatable)
                  .map((f) => (
                    <code key={f.key} className="mx-0.5 font-mono text-blue-500 dark:text-blue-400">
                      [{f.key}]
                    </code>
                  ))}
              </p>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingField ? 'Salvar Alterações' : 'Criar Campo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalculatedFieldModal;
