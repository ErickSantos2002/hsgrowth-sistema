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
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center">
      {/* Ícone animado */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-full border border-slate-700/50">
          <Construction size={64} className="text-blue-400" />
        </div>
      </div>

      {/* Título */}
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
        {titulo}
      </h1>

      {/* Badge "Em Construção" */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full mb-6">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-yellow-400">Em Construção</span>
      </div>

      {/* Descrição */}
      <p className="text-slate-400 max-w-md mb-8 text-lg">
        {descricao}
      </p>

      {/* Botão Voltar */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/50 text-white rounded-lg transition-all"
      >
        <ArrowLeft size={18} />
        Voltar ao Dashboard
      </button>
    </div>
  );
};

export default EmConstrucao;
