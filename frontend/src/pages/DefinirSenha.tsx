import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import authService from "../services/authService";
import { showError, showSuccess } from "../utils/toast";
import { LoadingSpinner } from "../components/common";
import { AuthCard, botaoAuthClasse, inputAuthClasse, rotuloAuthClasse } from "../components/auth/AuthCard";

type Conferencia = { valido: boolean; kind?: "convite" | "redefinir"; nome?: string; email?: string };

// Página pública aberta pelo link do e-mail (convite ou redefinição de senha).
export default function DefinirSenha() {
    const [params] = useSearchParams();
    const token = params.get("token") || "";
    const navigate = useNavigate();
    const [conferencia, setConferencia] = useState<Conferencia | null>(null);
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!token) {
            setConferencia({ valido: false });
            return;
        }
        authService
            .conferirToken(token)
            .then(setConferencia)
            .catch(() => setConferencia({ valido: false }));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        if (novaSenha.length < 8) {
            setErro("A senha precisa ter pelo menos 8 caracteres.");
            return;
        }
        if (novaSenha !== confirmar) {
            setErro("As senhas não são iguais.");
            return;
        }
        setEnviando(true);
        try {
            await authService.definirSenha(token, novaSenha);
            showSuccess("Senha criada. Faça o login.");
            navigate("/login");
        } catch (error: any) {
            const detalhe = error?.response?.data?.detail;
            const mensagem = typeof detalhe === "string" ? detalhe : "Não foi possível definir a senha.";
            setErro(mensagem);
            showError(mensagem);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <AuthCard subtitulo={conferencia?.kind === "redefinir" ? "Redefinir senha" : "Criar senha"}>
            {conferencia === null ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="md" />
                </div>
            ) : !conferencia.valido ? (
                <div className="space-y-4 text-center">
                    <p className="text-slate-700 dark:text-slate-300">Este link expirou ou já foi usado.</p>
                    <Link to="/esqueci-senha" className="text-sm text-blue-500 hover:underline">
                        Pedir um novo
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-slate-700 dark:text-slate-300">Olá, {conferencia.nome}</p>
                    {erro && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            {erro}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label htmlFor="email" className={rotuloAuthClasse}>Email</label>
                        <input id="email" type="email" value={conferencia.email || ""} readOnly className={inputAuthClasse} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="nova" className={rotuloAuthClasse}>Nova senha</label>
                        <input
                            id="nova"
                            type="password"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            disabled={enviando}
                            autoComplete="new-password"
                            minLength={8}
                            autoFocus
                            className={inputAuthClasse}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="confirmar" className={rotuloAuthClasse}>Confirmar senha</label>
                        <input
                            id="confirmar"
                            type="password"
                            value={confirmar}
                            onChange={(e) => setConfirmar(e.target.value)}
                            disabled={enviando}
                            autoComplete="new-password"
                            minLength={8}
                            className={inputAuthClasse}
                        />
                    </div>
                    <button type="submit" disabled={enviando} className={botaoAuthClasse}>
                        {enviando ? "Salvando..." : "Definir senha"}
                    </button>
                </form>
            )}
        </AuthCard>
    );
}
