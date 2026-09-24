import { useState } from "react";
import {
  AlertTriangle,
  Copy,
  FileText,
  HelpCircle,
  Lightbulb,
  MessageSquare,
} from "lucide-react";

import { SugestaoDaIA } from "../../services/cardTaskService";

/**
 * Uma sugestão da IA.
 *
 * No meio de uma reunião o vendedor tem uns cinco segundos de atenção: cada
 * bloco é curto, e os opcionais (pergunta, alertas, fato do CRM) só aparecem
 * quando têm conteúdo.
 *
 * Usado na sala e no histórico do card — a mesma leitura nos dois lugares.
 */
const AssistSuggestion: React.FC<{ sugestao: SugestaoDaIA; compacto?: boolean }> = ({
  sugestao,
  compacto,
}) => {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sugestao.fala);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem permissão de área de transferência: o texto continua na tela
    }
  };

  return (
    <div className="space-y-2 rounded border border-gray-200 bg-gray-50 dark:border-slate-700/50 dark:bg-slate-800/40 p-2.5 text-xs">
      <p className="flex gap-1.5 text-slate-700 dark:text-slate-200">
        <Lightbulb size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
        <span>{sugestao.leitura}</span>
      </p>

      <div className="rounded bg-gray-100 dark:bg-slate-900/60 p-2">
        <p className="flex gap-1.5 text-slate-100">
          <MessageSquare size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" />
          <span className="leading-relaxed">{sugestao.fala}</span>
        </p>
        <button
          onClick={copiar}
          className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          <Copy size={11} />
          {copiado ? "Copiado" : "Copiar fala"}
        </button>
      </div>

      {sugestao.pergunta && (
        <p className="flex gap-1.5 text-slate-600 dark:text-slate-300">
          <HelpCircle size={13} className="mt-0.5 flex-shrink-0 text-sky-400" />
          <span>{sugestao.pergunta}</span>
        </p>
      )}

      {sugestao.alertas?.map((alerta, i) => (
        <p key={i} className="flex gap-1.5 text-amber-300/90">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{alerta}</span>
        </p>
      ))}

      {sugestao.fato_crm && (
        <p className="flex gap-1.5 text-slate-600 dark:text-slate-300">
          <FileText size={13} className="mt-0.5 flex-shrink-0 text-purple-400" />
          <span>{sugestao.fato_crm}</span>
        </p>
      )}

      {!compacto && sugestao.marcadores?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {sugestao.marcadores.map((marcador) => (
            <span
              key={marcador}
              className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400"
            >
              {marcador.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssistSuggestion;
