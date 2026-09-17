import { LinhaDoVendedor } from "../../services/reunioesService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

const cabecalho =
  "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";

/**
 * O recorte por pessoa, só para admin e gerente.
 *
 * É a aba "Resumo por Pessoa" da consultoria, viva dentro do CRM: em vez de
 * chegar uma vez por mês em planilha, fica ao lado das reuniões.
 */
const QuadroPorVendedor: React.FC<{ linhas: LinhaDoVendedor[] }> = ({ linhas }) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
    <div className="border-b border-gray-200 px-6 py-3 dark:border-slate-700">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Por vendedor</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
            <th className={cabecalho}>Vendedor</th>
            <th className={cabecalho}>Reuniões</th>
            <th className={cabecalho}>Score médio</th>
            {BLOCOS.map((bloco) => (
              <th key={bloco} className={cabecalho}>
                {bloco}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
          {linhas.map((linha) => (
            <tr
              key={linha.vendedor}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
                {linha.vendedor}
              </td>
              <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                {linha.reunioes}
              </td>
              <td className="px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                {linha.score_medio !== null ? linha.score_medio : "—"}
              </td>
              {BLOCOS.map((bloco) => (
                <td key={bloco} className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                  {linha.media_por_bloco[bloco] !== undefined
                    ? linha.media_por_bloco[bloco]
                    : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default QuadroPorVendedor;
