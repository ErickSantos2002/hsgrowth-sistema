import React, { useState } from "react";
import { Link } from "react-router-dom";
import authService from "../services/authService";
import { AuthCard, botaoAuthClasse, inputAuthClasse, rotuloAuthClasse } from "../components/auth/AuthCard";

export default function EsqueciSenha() {
    const [email, setEmail] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setEnviando(true);
        try {
            await authService.esqueciSenha(email);
        } catch {
            // A resposta é sempre a mesma, para não revelar quais e-mails existem.
        } finally {
            setEnviando(false);
            setEnviado(true);
        }
    };

    return (
        <AuthCard subtitulo="Esqueci minha senha">
            {enviado ? (
                <div className="space-y-4 text-center">
                    <p className="text-slate-700 dark:text-slate-300">
                        Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora.
                    </p>
                    <Link to="/login" className="text-sm text-blue-500 hover:underline">
                        Voltar ao login
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="email" className={rotuloAuthClasse}>Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="seu.email@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={enviando}
                            autoComplete="email"
                            autoFocus
                            required
                            className={inputAuthClasse}
                        />
                    </div>
                    <button type="submit" disabled={enviando} className={botaoAuthClasse}>
                        {enviando ? "Enviando..." : "Enviar link"}
                    </button>
                    <div className="text-center">
                        <Link to="/login" className="text-sm text-blue-500 hover:underline">
                            Voltar ao login
                        </Link>
                    </div>
                </form>
            )}
        </AuthCard>
    );
}
