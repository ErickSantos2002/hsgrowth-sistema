import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import { Button, FormField, Input } from "../common";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import {
  COMISSAO_STATUS_COR, LIMITE_CALIBRACOES, PERFIS_COMISSOES, PERFIS_COMISSOES_TUDO, formatarMoeda,
} from "../../constants/parcerias";
import { dia } from "../../utils/formatters";
import parceriasService, { mensagemDeErro, type Calibracao } from "../../services/parceriasService";

const dataDaCalibracao = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");

/** Calibrações agrupadas por aparelho, na ordem em que o aparelho apareceu. */
function porAparelho(itens: Calibracao[]): [string, Calibracao[]][] {
  const mapa = new Map<string, Calibracao[]>();
  itens.forEach((c) => mapa.set(c.serial_number, [...(mapa.get(c.serial_number) ?? []), c]));
  return [...mapa];
}

/** "Pendente" ou "Paga em dd/mm/aaaa". */
function SituacaoDaComissao({ c }: { c: Calibracao }) {
  if (!c.commission_status) return <span className="text-xs text-slate-400">Sem comissão</span>;
  const paga = c.commission_status === "paga";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${COMISSAO_STATUS_COR[c.commission_status]}`}>
      {paga ? `Paga${c.commission_paid_at ? ` em ${dia(c.commission_paid_at)}` : ""}` : "Pendente"}
    </span>
  );
}

// Formato pt-BR: "." separa milhar e "," é decimal.
const lerNumero = (v: string): number => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

interface Props {
  oportunidadeId: number;
}

/**
 * Calibrações da oportunidade (só com ganho confirmado). Admin, gerente e Financeiro lançam;
 * o dono (parceiro/hunter) só acompanha. O servidor normaliza o nº de série e limita a 2 por aparelho.
 */
export default function CalibracoesDaOportunidade({ oportunidadeId }: Props) {
  const { user } = useAuth();
  const papel = user?.role ?? "";
  const podeVer = PERFIS_COMISSOES.includes(papel);
  const podeLancar = PERFIS_COMISSOES_TUDO.includes(papel);

  const [itens, setItens] = useState<Calibracao[]>([]);
  const [serie, setSerie] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setItens(await parceriasService.listarCalibracoes(oportunidadeId));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao carregar as calibrações."));
    }
  }, [oportunidadeId]);

  useEffect(() => { if (podeVer) carregar(); }, [podeVer, carregar]);

  if (!podeVer) return null;

  const valorNum = lerNumero(valor);
  const podeSalvar = !!serie.trim() && !!data && valorNum > 0 && !salvando;

  const lancar = async () => {
    setSalvando(true);
    try {
      await parceriasService.lancarCalibracao(oportunidadeId, {
        serial_number: serie.trim(),
        calibration_date: data,
        value: valorNum,
      });
      showSuccess("Calibração lançada.");
      setSerie(""); setData(""); setValor("");
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao lançar a calibração."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ExpandableSection title="Calibrações" icon={<Wrench size={18} />} badge={itens.length} defaultExpanded={itens.length > 0}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cada aparelho rende comissão em até {LIMITE_CALIBRACOES} calibrações. A comissão entra como pendente em
          Comissões → A pagar e fica paga quando o Financeiro marcar o pagamento.
        </p>
        {itens.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma calibração lançada.</p>
        ) : (
          porAparelho(itens).map(([serie, lista]) => {
            const usadas = lista.filter((c) => c.recorrencia != null).length;
            const esgotado = usadas >= LIMITE_CALIBRACOES;
            return (
              <div key={serie} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700/50 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{serie}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      esgotado
                        ? "bg-gray-500/15 text-gray-600 dark:text-gray-400"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {usadas} de {LIMITE_CALIBRACOES} recorrências{esgotado ? " · limite atingido" : ""}
                  </span>
                </div>
                <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-700/50">
                  {lista.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {c.recorrencia ? `${c.recorrencia}ª calibração` : "Calibração"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Calibrada em {dataDaCalibracao(c.calibration_date)} · {formatarMoeda(Number(c.value))}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {c.commission_amount != null && (
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{formatarMoeda(Number(c.commission_amount))}</span>
                        )}
                        <SituacaoDaComissao c={c} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}

        {podeLancar && (
          <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-slate-700/50">
            <FormField label="Nº de série">
              <Input value={serie} maxLength={60} onChange={(e) => setSerie(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Data da calibração">
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </FormField>
              <FormField label="Valor (R$)">
                <Input value={valor} inputMode="decimal" placeholder="0,00" onChange={(e) => setValor(e.target.value.replace(/[^0-9,.]/g, ""))} />
              </FormField>
            </div>
            <Button onClick={lancar} loading={salvando} disabled={!podeSalvar} fullWidth>Lançar calibração</Button>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
}
