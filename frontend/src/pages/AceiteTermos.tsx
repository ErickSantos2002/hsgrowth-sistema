import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";
import parceriasService, { mensagemDeErro, type TermosPendentes } from "../services/parceriasService";
import { AuthCard, botaoAuthClasse } from "../components/auth/AuthCard";

// Aceite obrigatório dos termos do Programa de Parceiros — dono/hunter já logado.
export default function AceiteTermos() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [termos, setTermos] = useState<TermosPendentes | null>(null);
    const [aceito, setAceito] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        parceriasService
            .termosPendentes()
            .then(async (t) => {
                if (!t.pendente) {
                    // Sem termos pendentes: atualiza o usuário do contexto antes de sair (senão o layout devolve para cá).
                    try {
                        updateUser(await authService.getMe());
                    } catch {
                        // Navegar com o usuário antigo faria o layout devolver para cá em loop.
                        setErro("Não foi possível atualizar o seu cadastro. Recarregue a página.");
                        return;
                    }
                    navigate("/parcerias", { replace: true });
                } else setTermos(t);
            })
            .catch((e) => setErro(mensagemDeErro(e, "Não foi possível carregar os termos.")));
    }, [navigate, updateUser]);

    // Quem não tem termos pendentes não tem o que fazer aqui.
    useEffect(() => {
        if (user && !user.termos_pendentes && !termos) navigate("/", { replace: true });
    }, [user, termos, navigate]);

    const handleAceitar = async () => {
        setErro("");
        setEnviando(true);
        try {
            try {
                await parceriasService.aceitarTermos();
            } catch (e: any) {
                // 422 = não há termos pendentes (já aceitos em outra aba): trata como concluído.
                if (e?.response?.status !== 422) {
                    setErro(mensagemDeErro(e, "Não foi possível registrar o aceite."));
                    return;
                }
            }
            try {
                updateUser(await authService.getMe());
            } catch {
                setErro("Aceite registrado, mas não foi possível atualizar o seu cadastro. Recarregue a página.");
                return;
            }
            navigate("/parcerias");
        } finally {
            setEnviando(false);
        }
    };

    const handleSair = async () => {
        await logout();
        window.location.href = "/login";
    };

    return (
        <AuthCard subtitulo="Leia e aceite os termos para continuar">
            <div className="space-y-5">
                {erro && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {erro}
                    </div>
                )}
                {(termos || !erro) && (
                    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300">
                        {termos ? termos.text : "Carregando..."}
                    </div>
                )}
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)}
                        disabled={enviando || !termos}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700" />
                    <span>Li e aceito os termos do Programa de Parceiros</span>
                </label>
                <button type="button" onClick={handleAceitar} disabled={enviando || !aceito || !termos} className={botaoAuthClasse}>
                    {enviando ? "Salvando..." : "Aceitar e continuar"}
                </button>
                <div className="text-center">
                    <button type="button" onClick={handleSair} className="text-sm text-slate-500 hover:underline">
                        Sair
                    </button>
                </div>
            </div>
        </AuthCard>
    );
}
