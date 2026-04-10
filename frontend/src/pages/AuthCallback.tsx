import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import authService from "../services/authService";
import { LoadingSpinner } from "../components/common";

const ERROR_MESSAGES: Record<string, string> = {
  microsoft_auth_failed: "Falha na autenticação com Microsoft. Tente novamente.",
  user_not_found: "Nenhuma conta HSGrowth encontrada para este e-mail Microsoft. Contate o administrador.",
  user_inactive: "Sua conta está inativa. Contate o administrador.",
};

/**
 * Página intermediária do SSO Microsoft.
 * O backend redireciona para /auth/callback?access_token=...&refresh_token=...
 * Esta página salva os tokens e redireciona para o sistema.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get("error");
      if (error) {
        setErrorMsg(ERROR_MESSAGES[error] ?? "Erro na autenticação. Tente novamente.");
        return;
      }

      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setErrorMsg("Tokens inválidos. Tente fazer login novamente.");
        return;
      }

      // Salva os tokens no localStorage
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      // Busca os dados completos do usuário (salva no localStorage internamente)
      try {
        await authService.getMe();
        window.location.href = "/";
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setErrorMsg("Não foi possível carregar os dados do usuário. Tente novamente.");
      }
    };

    handleCallback();
  }, []);

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-8 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="mb-4 text-center text-red-400">{errorMsg}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-medium text-white hover:from-blue-600 hover:to-cyan-600"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
        <LoadingSpinner size="lg" />
        <p>Autenticando com Microsoft...</p>
      </div>
    </div>
  );
}
