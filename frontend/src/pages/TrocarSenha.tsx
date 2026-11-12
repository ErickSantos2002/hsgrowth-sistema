import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";
import { showSuccess } from "../utils/toast";
import { AuthCard, botaoAuthClasse, inputAuthClasse, rotuloAuthClasse } from "../components/auth/AuthCard";

// Troca obrigatória no primeiro acesso (senha temporária) — usuário já logado.
export default function TrocarSenha() {
    const { updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        if (nova.length < 8) {
            setErro("A nova senha precisa ter pelo menos 8 caracteres.");
            return;
        }
        if (nova !== confirmar) {
            setErro("As senhas não são iguais.");
            return;
        }
        setEnviando(true);
        try {
            // trocarSenha guarda os tokens novos e já devolve o usuário atualizado.
            const usuario = await authService.trocarSenha(atual, nova);
            updateUser(usuario);
            showSuccess("Senha alterada.");
            navigate("/");
        } catch (error: any) {
            const detalhe = error?.response?.data?.detail;
            setErro(typeof detalhe === "string" ? detalhe : "Não foi possível trocar a senha.");
        } finally {
            setEnviando(false);
        }
    };

    const handleSair = async () => {
        await logout();
        window.location.href = "/login";
    };

    return (
        <AuthCard subtitulo="Troque a sua senha para continuar">
            <form onSubmit={handleSubmit} className="space-y-5">
                {erro && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {erro}
                    </div>
                )}
                <div className="space-y-2">
                    <label htmlFor="atual" className={rotuloAuthClasse}>Senha atual</label>
                    <input id="atual" type="password" value={atual} onChange={(e) => setAtual(e.target.value)}
                        disabled={enviando} autoComplete="current-password" autoFocus className={inputAuthClasse} />
                </div>
                <div className="space-y-2">
                    <label htmlFor="nova" className={rotuloAuthClasse}>Nova senha</label>
                    <input id="nova" type="password" value={nova} onChange={(e) => setNova(e.target.value)}
                        disabled={enviando} autoComplete="new-password" minLength={8} className={inputAuthClasse} />
                </div>
                <div className="space-y-2">
                    <label htmlFor="confirmar" className={rotuloAuthClasse}>Confirmar nova senha</label>
                    <input id="confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                        disabled={enviando} autoComplete="new-password" minLength={8} className={inputAuthClasse} />
                </div>
                <button type="submit" disabled={enviando || !atual} className={botaoAuthClasse}>
                    {enviando ? "Salvando..." : "Trocar senha"}
                </button>
                <div className="text-center">
                    <button type="button" onClick={handleSair} className="text-sm text-slate-500 hover:underline">
                        Sair
                    </button>
                </div>
            </form>
        </AuthCard>
    );
}
