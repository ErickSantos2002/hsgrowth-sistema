import { Link, Navigate } from "react-router-dom";
import { Handshake, Trello } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function ParceriasHome() {
  const { user } = useAuth();
  // O parceiro trabalha no Pipeline; o card dele no board 1 abre pelo menu do board.
  if (user?.role === "partner") return <Navigate to="/parcerias/oportunidades" replace />;

  const cartao = "flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 transition hover:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-800/40";

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">Parcerias</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Programa de Parceiros da Health &amp; Safety.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/parcerias/aquisicao" className={cartao}>
          <Handshake className="text-emerald-500" size={28} />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Aquisição de Parceiros</h2>
            <p className="text-sm text-slate-500">Da prospecção até a ativação de cada parceiro.</p>
          </div>
        </Link>
        <Link to="/parcerias/oportunidades" className={cartao}>
          <Trello className="text-emerald-500" size={28} />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Pipeline de Parceiros</h2>
            <p className="text-sm text-slate-500">As oportunidades que os parceiros registram.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
