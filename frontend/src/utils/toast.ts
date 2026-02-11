/**
 * Utilitários de Toast centralizados
 *
 * Wraps do react-hot-toast com estilização padronizada do sistema.
 * Use estes helpers ao invés de alert() ou console.error() para
 * melhor UX e consistência visual.
 */

import toast from "react-hot-toast";
import { COLORS } from "../constants/colors";

/**
 * Configuração de estilo padrão para todos os toasts
 */
const defaultStyle = {
  background: COLORS.surface.elevated,
  color: COLORS.content.primary,
  border: `1px solid ${COLORS.border.default}`,
  borderRadius: "0.5rem",
  padding: "12px 16px",
};

/**
 * Exibe toast de sucesso
 *
 * @param message - Mensagem a ser exibida
 * @param duration - Duração em ms (padrão: 4000)
 *
 * @example
 * ```ts
 * showSuccess("Usuário criado com sucesso!");
 * ```
 */
export const showSuccess = (message: string, duration: number = 4000) => {
  return toast.success(message, {
    duration,
    style: defaultStyle,
    iconTheme: {
      primary: COLORS.primary,
      secondary: COLORS.content.primary,
    },
  });
};

/**
 * Exibe toast de erro
 *
 * @param message - Mensagem de erro
 * @param duration - Duração em ms (padrão: 5000)
 *
 * @example
 * ```ts
 * showError("Falha ao carregar dados");
 * ```
 */
export const showError = (message: string, duration: number = 5000) => {
  return toast.error(message, {
    duration,
    style: defaultStyle,
    iconTheme: {
      primary: COLORS.status.error,
      secondary: COLORS.content.primary,
    },
  });
};

/**
 * Exibe toast de aviso/warning
 *
 * @param message - Mensagem de aviso
 * @param duration - Duração em ms (padrão: 4500)
 *
 * @example
 * ```ts
 * showWarning("Atenção: Esta ação não pode ser desfeita");
 * ```
 */
export const showWarning = (message: string, duration: number = 4500) => {
  return toast(message, {
    duration,
    style: defaultStyle,
    icon: "⚠️",
  });
};

/**
 * Exibe toast de informação
 *
 * @param message - Mensagem informativa
 * @param duration - Duração em ms (padrão: 4000)
 *
 * @example
 * ```ts
 * showInfo("Dados atualizados");
 * ```
 */
export const showInfo = (message: string, duration: number = 4000) => {
  return toast(message, {
    duration,
    style: defaultStyle,
    icon: "ℹ️",
  });
};

/**
 * Exibe toast de loading (spinner)
 *
 * @param message - Mensagem durante loading
 * @returns ID do toast para posterior dismiss
 *
 * @example
 * ```ts
 * const toastId = showLoading("Salvando...");
 * await saveData();
 * toast.dismiss(toastId);
 * showSuccess("Salvo!");
 * ```
 */
export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: defaultStyle,
  });
};

/**
 * Exibe toast promise - útil para operações assíncronas
 *
 * @param promise - Promise a ser executada
 * @param messages - Mensagens para cada estado
 *
 * @example
 * ```ts
 * await showPromise(
 *   saveData(),
 *   {
 *     loading: "Salvando...",
 *     success: "Salvo com sucesso!",
 *     error: "Erro ao salvar",
 *   }
 * );
 * ```
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: defaultStyle,
      success: {
        iconTheme: {
          primary: COLORS.primary,
          secondary: COLORS.content.primary,
        },
      },
      error: {
        iconTheme: {
          primary: COLORS.status.error,
          secondary: COLORS.content.primary,
        },
      },
    }
  );
};

/**
 * Helper para tratamento de erro padrão
 *
 * Extrai mensagem de erro de diferentes formatos e exibe toast
 *
 * @param error - Erro capturado (Error, AxiosError, string, etc)
 * @param fallbackMessage - Mensagem padrão caso não consiga extrair
 *
 * @example
 * ```ts
 * try {
 *   await api.call();
 * } catch (error) {
 *   handleError(error, "Erro ao processar");
 * }
 * ```
 */
export const handleError = (error: any, fallbackMessage: string = "Erro ao processar solicitação") => {
  console.error(error); // Mantém log para debug

  let message = fallbackMessage;

  // Tenta extrair mensagem de erro de diferentes formatos
  if (typeof error === "string") {
    message = error;
  } else if (error?.response?.data?.detail) {
    // Erro do FastAPI/Backend
    message = error.response.data.detail;
  } else if (error?.message) {
    // Error object padrão
    message = error.message;
  }

  return showError(message);
};

// Re-exporta toast original para casos especiais
export { toast };
