import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { MOTIVO_SEMAFORO, SEMAFORO_COR, SEMAFORO_LABEL } from "../../constants/parcerias";
import type { ConsultaCnpj } from "../../services/parceriasService";

/** Cartão com a cor do semáforo, a frase e, para a H&S, onde a empresa está. */
export default function ResultadoSemaforo({ consulta }: { consulta: ConsultaCnpj }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${SEMAFORO_COR[consulta.resultado]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-block h-3 w-3 rounded-full bg-current" />
        {SEMAFORO_LABEL[consulta.resultado]}
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{consulta.frase}</p>
      {consulta.registros.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-current/20 pt-3">
          {consulta.registros.map((r) => (
            <li key={`${r.tipo}-${r.id}`} className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">{r.titulo}</span>
              <span>· {r.onde}</span>
              {r.responsavel && <span>· {r.responsavel}</span>}
              <span>· {MOTIVO_SEMAFORO[r.motivo]}{r.cnpj !== consulta.cnpj && " (outra unidade)"}</span>
              <Link
                to={r.tipo === "card" ? `/cards/${r.id}` : `/parcerias/oportunidades/${r.id}`}
                className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
              >
                abrir <ExternalLink size={11} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
