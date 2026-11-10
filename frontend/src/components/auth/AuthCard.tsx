import React from "react";
import logo from "../../assets/logo.png";

// Mesma moldura do Login (fundo, cartão e logo), usada nas telas de senha.
export const inputAuthClasse =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500";

export const botaoAuthClasse =
    "w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-blue-500/20";

export const rotuloAuthClasse = "block text-sm font-medium text-slate-700 dark:text-slate-300";

export function AuthCard({ subtitulo, children }: { subtitulo: string; children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
                    <div className="mb-8 flex flex-col items-center">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-300 opacity-50 blur-lg"></div>
                            <div className="relative rounded-full bg-gradient-to-br from-cyan-300 to-blue-200 p-2">
                                <img src={logo} alt="HSGrowth CRM" className="h-16 w-16 object-contain" />
                            </div>
                        </div>
                        <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
                            HSGrowth CRM
                        </h1>
                        <p className="mt-2 text-center text-slate-500 dark:text-slate-400">{subtitulo}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
