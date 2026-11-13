import { useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { formatarMoeda } from "../../constants/parcerias";
import { useAuth } from "../../hooks/useAuth";
import parceriasService, { type TabelaDesconto as Tabela } from "../../services/parceriasService";

const TH = "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";
const TD = "whitespace-nowrap px-6 py-3 text-sm text-slate-900 dark:text-white";
const pct = (v: string) => `${Number(v).toLocaleString("pt-BR")}%`;

/**
 * "Desconto × sua remuneração": quanto a empresa (ou o hunter) ganha por aparelho em cada faixa de
 * desconto. Os números vêm do servidor (configuração + preço do produto liberado); some com tudo zerado.
 */
export default function TabelaDesconto() {
  const { user } = useAuth();
  const hunter = user?.role === "hunter";
  const [t, setT] = useState<Tabela | null>(null);

  useEffect(() => {
    parceriasService.tabelaDesconto().then(setT).catch(() => setT(null));
  }, []);

  if (!t || t.linhas.every((l) => Number(hunter ? l.taxa_hunter : l.taxa_empresa) === 0)) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
      <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-slate-700/50">
        <Percent size={18} className="text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Desconto × sua remuneração</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className={TH}>Desconto</th>
              {t.preco_referencia && <th className={`${TH} !text-right`}>Cliente paga</th>}
              <th className={`${TH} !text-right`}>Sua remuneração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
            {t.linhas.map((l) => {
              const taxa = hunter ? l.taxa_hunter : l.taxa_empresa;
              const valor = hunter ? l.valor_hunter : l.valor_empresa;
              return (
                <tr key={l.desconto} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className={TD}>{l.desconto === 0 ? "Sem desconto" : `${l.desconto}%`}</td>
                  {t.preco_referencia && (
                    <td className={`${TD} text-right`}>{l.cliente_paga ? formatarMoeda(Number(l.cliente_paga)) : "—"}</td>
                  )}
                  <td className={`${TD} text-right font-medium`}>
                    {valor ? `${formatarMoeda(Number(valor))} (${pct(taxa)})` : pct(taxa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-200 px-6 py-3 text-xs text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
        Valores por aparelho. Desconto permitido: até 6%; cada ponto de desconto reduz meio ponto da sua remuneração.
        {!hunter && t.renovacao_prevista && ` As renovações (${formatarMoeda(Number(t.renovacao_prevista))}) não mudam com o desconto.`}
      </p>
    </div>
  );
}
