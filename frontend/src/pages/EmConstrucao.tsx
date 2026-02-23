import React from "react";
import { Construction, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmConstrucaoProps {
  titulo: string;
  descricao?: string;
}

const EmConstrucao: React.FC<EmConstrucaoProps> = ({
  titulo,
  descricao = "Esta página está sendo desenvolvida e estará disponível em breve."
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center p-6 text-center">
      {/* Ícone animado */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20 blur-2xl"></div>
        <div className="relative rounded-full border border-gray-200 bg-white p-8 dark:border-slate-700/50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <Construction size={64} className="text-blue-500 dark:text-blue-400" />
        </div>
      </div>

      {/* Título */}
      <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
        {titulo}
      </h1>

      {/* Badge "Em Construção" */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Em Construção</span>
      </div>

      {/* Descrição */}
      <p className="mb-8 max-w-md text-lg text-slate-600 dark:text-slate-400">
        {descricao}
      </p>

      {/* Botão Voltar */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-slate-900 transition-all hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:hover:border-slate-600/50 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={18} />
        Voltar ao Dashboard
      </button>
    </div>
  );
};

export default EmConstrucao;
