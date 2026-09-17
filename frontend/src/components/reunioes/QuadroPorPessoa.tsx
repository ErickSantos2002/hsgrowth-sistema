import { LinhaDoQuadro } from "../../services/reunioesService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

const cabecalho =
  "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";

export type VisaoDoQuadro = "vendedor" | "sdr";

interface Props {
  porVendedor: LinhaDoQuadro[];
  porSdr: LinhaDoQuadro[];
  visao: VisaoDoQuadro;
  onMudarVisao: (visao: VisaoDoQuadro) => void;
}

/**
 * O recorte por pessoa, só para admin e gerente.
 *
 * É a aba "Resumo por Pessoa" da consultoria, viva dentro do CRM. Por vendedor
 * mostra quem conduziu; por SDR, quem agendou — a mesma reunião conta dos dois
 * lados, e é assim que se enxerga o que a pré-venda colocou de pé.
 */
const QuadroPorPessoa: React.FC<Props> = ({ porVendedor, porSdr, visao, onMudarVisao }) => {
  const linhas = visao === "vendedor" ? porVendedor : porSdr;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {visao === "vendedor" ? "Por vendedor" : "Por SDR"}
        </h2>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-slate-800">
          {(["vendedor", "sdr"] as VisaoDoQuadro[]).map((opcao) => (
            <button
              key={opcao}
              onClick={() => onMudarVisao(opcao)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                visao === opcao
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {opcao === "vendedor" ? "Vendedor" : "SDR"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
              <th className={cabecalho}>{visao === "vendedor" ? "Vendedor" : "SDR"}</th>
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
            {linhas.map((linha) => {
              const nome = (visao === "vendedor" ? linha.vendedor : linha.sdr) || "—";
              return (
                <tr
                  key={nome}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {nome}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {linha.reunioes}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {linha.score_medio !== null ? linha.score_medio : "—"}
                  </td>
                  {BLOCOS.map((bloco) => (
                    <td
                      key={bloco}
                      className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400"
                    >
                      {linha.media_por_bloco[bloco] !== undefined
                        ? linha.media_por_bloco[bloco]
                        : "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuadroPorPessoa;
