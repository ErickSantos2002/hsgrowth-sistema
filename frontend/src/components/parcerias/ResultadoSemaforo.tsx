import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { MOTIVO_SEMAFORO, SEMAFORO_COR, SEMAFORO_LABEL } from "../../constants/parcerias";
import type { ConsultaCnpj, RegrasCnpj } from "../../services/parceriasService";
import { BotaoRegrasSemaforo, useRegrasCnpj } from "./RegrasSemaforo";

/** Raiz do CNPJ (os 8 primeiros caracteres) no formato 00.000.000. */
const raizFormatada = (cnpj: string) => {
  const r = cnpj.replace(/[^0-9A-Za-z]/g, "").slice(0, 8).toUpperCase();
  return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}`;
};

/** Por que deu essa cor, em uma linha (as regras completas ficam no "?"). */
function porque(c: ConsultaCnpj, regras: RegrasCnpj): string {
  const raiz = raizFormatada(c.cnpj);
  switch (c.motivo) {
    case "livre":
      return `Nenhum card de Vendas nem oportunidade de parceiro com este CNPJ ou com outra unidade da raiz ${raiz}.`;
    case "outra_unidade":
      return `Este CNPJ está livre, mas outra unidade da raiz ${raiz} está em negociação, comprou ou foi perdida há pouco.`;
    case "em_negociacao":
      return `Há card ou oportunidade aberto com este CNPJ, com atividade agendada ou movimento nos últimos ${regras.protection_days} dias.`;
    case "compra_recente":
      return `A empresa comprou há menos de ${regras.recent_purchase_days} dias.`;
    case "perdida_recente":
      return `A negociação com a empresa foi perdida há menos de ${regras.recent_loss_days} dias.`;
    default:
      return "";
  }
}

/** Cartão com a cor do semáforo, a frase, o porquê e, para a H&S, onde a empresa está. */
export default function ResultadoSemaforo({ consulta }: { consulta: ConsultaCnpj }) {
  const regras = useRegrasCnpj();
  const motivoDetalhado = porque(consulta, regras);
  return (
    <div className={`rounded-lg border px-4 py-3 ${SEMAFORO_COR[consulta.resultado]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-block h-3 w-3 rounded-full bg-current" />
        {SEMAFORO_LABEL[consulta.resultado]}
        {consulta.motivo !== "livre" && <span className="font-normal">· {MOTIVO_SEMAFORO[consulta.motivo]}</span>}
        <span className="ml-auto">
          <BotaoRegrasSemaforo />
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{consulta.frase}</p>
      {motivoDetalhado && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{motivoDetalhado}</p>
      )}
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
