import React, { useState } from "react";
import { Key, AlertCircle } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { User } from "../../types";
import { LoadingSpinner } from "../common";

interface AdminPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPassword: string | null) => void;
  user: User | null;
}

/**
 * Modal para admin resetar senha de outro usuário
 * Permite definir senha manualmente ou gerar senha temporária
 */
const AdminPasswordResetModal: React.FC<AdminPasswordResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState<"manual" | "auto">("manual");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Reseta formulário quando modal abre/fecha
  React.useEffect(() => {
    if (isOpen) {
      setResetMode("manual");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: {
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (resetMode === "manual") {
      if (!newPassword) {
        newErrors.newPassword = "Nova senha é obrigatória";
      } else if (newPassword.length < 8) {
        newErrors.newPassword = "Senha deve ter no mínimo 8 caracteres";
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = "Confirmação de senha é obrigatória";
      } else if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = "Senhas não coincidem";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetMode === "manual" && !validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Retorna os dados para o componente pai processar
      if (resetMode === "auto") {
        onSuccess(null); // null indica senha automática
      } else {
        onSuccess(newPassword);
      }
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Resetar Senha"
      subtitle={`Definir nova senha para ${user.name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Resetando...
              </>
            ) : (
              <>
                <Key size={16} />
                Resetar Senha
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Modo de Reset */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Como deseja resetar a senha?
          </label>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="resetMode"
                value="manual"
                checked={resetMode === "manual"}
                onChange={(e) => setResetMode(e.target.value as "manual")}
                className="mt-1 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <span className="font-medium text-slate-900 dark:text-white">
                  Definir senha manualmente
                </span>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Você escolhe a nova senha para o usuário
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="resetMode"
                value="auto"
                checked={resetMode === "auto"}
                onChange={(e) => setResetMode(e.target.value as "auto")}
                className="mt-1 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <span className="font-medium text-slate-900 dark:text-white">
                  Gerar senha temporária automática
                </span>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Sistema gera uma senha aleatória que será exibida após o reset
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Formulário de senha manual */}
        {resetMode === "manual" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nova Senha *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                disabled={loading}
              />
              {errors.newPassword && (
                <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle size={14} />
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </>
        )}

        {/* Alerta informativo */}
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Importante:</strong> O usuário deverá usar a nova senha no
            próximo login. Certifique-se de informá-lo sobre a alteração.
          </p>
        </div>
      </form>
    </BaseModal>
  );
};

export default AdminPasswordResetModal;
