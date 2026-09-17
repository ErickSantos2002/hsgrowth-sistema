import { LinhaDoVendedor } from "../../services/reunioesService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

/**
 * O recorte por pessoa, só para admin e gerente.
 *
 * É a aba "Resumo por Pessoa" da consultoria, viva dentro do CRM: em vez de
 * chegar uma vez por mês em planilha, fica ao lado das reuniões.
 */
const QuadroPorVendedor: React.FC<{ linhas: LinhaDoVendedor[] }> = ({ linhas }) => (
  <div className="overflow-x-auto rounded border border-slate-700/50">
    <table className="w-full text-left text-xs">
      <thead className="bg-slate-800/60 text-slate-400">
        <tr>
          <th className="px-3 py-2">Vendedor</th>
          <th className="px-3 py-2">Reuniões</th>
          <th className="px-3 py-2">Score médio</th>
          {BLOCOS.map((bloco) => (
            <th key={bloco} className="px-3 py-2">
              {bloco}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.vendedor} className="border-t border-slate-700/40">
            <td className="px-3 py-2 text-slate-200">{linha.vendedor}</td>
            <td className="px-3 py-2 text-slate-300">{linha.reunioes}</td>
            <td className="px-3 py-2 text-slate-100">
              {linha.score_medio !== null ? linha.score_medio : "—"}
            </td>
            {BLOCOS.map((bloco) => (
              <td key={bloco} className="px-3 py-2 text-slate-400">
                {linha.media_por_bloco[bloco] !== undefined ? linha.media_por_bloco[bloco] : "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default QuadroPorVendedor;
