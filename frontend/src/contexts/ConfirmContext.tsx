import React, { createContext, useContext, useCallback, useState, useRef } from "react";
import ConfirmModal from "../components/kanban/ConfirmModal";

/**
 * Opções para o diálogo de confirmação
 */
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

/**
 * Shape do contexto — expõe apenas a função confirm()
 */
interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Estado interno do provider
 * Guarda a Promise pendente (resolve) enquanto o modal está aberto
 */
interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: "",
  message: "",
};

/**
 * Provider do contexto de confirmação
 *
 * Envolve a aplicação e renderiza um único ConfirmModal global.
 * Qualquer componente filho pode chamar `useConfirm()` para abrir
 * o modal e aguardar a resposta do usuário via Promise.
 *
 * @example
 * // Em App.tsx:
 * <ConfirmProvider>
 *   <AppRoutes />
 * </ConfirmProvider>
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    options: DEFAULT_OPTIONS,
    resolve: null,
  });

  /**
   * Abre o modal e retorna uma Promise que resolve quando o usuário
   * confirmar (true) ou cancelar (false)
   */
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, options, resolve });
    });
  }, []);

  /**
   * Handler de confirmação — resolve a Promise com true
   */
  const handleConfirm = () => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  /**
   * Handler de cancelamento — resolve a Promise com false
   */
  const handleClose = () => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.options.title}
        message={state.options.message}
        confirmText={state.options.confirmText}
        cancelText={state.options.cancelText}
        isDanger={state.options.isDanger}
      />
    </ConfirmContext.Provider>
  );
};

/**
 * Hook para acessar a função confirm() do contexto global
 *
 * @returns Função confirm() que abre o modal e retorna Promise<boolean>
 *
 * @example
 * const { confirm } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: "Deletar item",
 *     message: "Esta ação não pode ser desfeita.",
 *     confirmText: "Deletar",
 *     isDanger: true,
 *   });
 *   if (!ok) return;
 *   await service.delete(id);
 * };
 */
export const useConfirm = (): ConfirmContextValue => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  }
  return context;
};
