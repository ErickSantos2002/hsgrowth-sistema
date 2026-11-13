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
import parceriasService, {
  mensagemDeErro, type Calibracao, type CalibracoesDaOportunidade as Dados,
} from "../../services/parceriasService";

const dataCurta = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
const DIA = 86_400_000;
/** Renovação prevista a 60 dias ou menos ganha o selo "faltam X dias". */
const AVISO_DIAS = 60;

/** Dias até a data (negativo = já passou), contando de hoje à meia-noite. */
function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / DIA);
}

/** "faltam X dias" (perto) ou "vencida há X dias" (passou sem calibração lançada). */
function SeloDoPrazo({ iso }: { iso: string }) {
  const d = diasAte(iso);
  const plural = (n: number) => (n === 1 ? "" : "s");
  if (d < 0) {
    return (
      <span className="whitespace-nowrap rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        vencida há {-d} dia{plural(-d)}
      </span>
    );
  }
  if (d > AVISO_DIAS) return null;
  return (
    <span className="whitespace-nowrap rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
      {d === 0 ? "vence hoje" : `faltam ${d} dia${plural(d)}`}
    </span>
  );
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

const CAIXA = "rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700/50 dark:bg-slate-800/50";

interface Props {
  oportunidadeId: number;
}

/**
 * Calibrações da oportunidade (só com ganho confirmado). Cada aparelho vendido mostra as 2 renovações
 * previstas (ganho + 12 e + 24 meses) e, quando lançadas, a calibração e a comissão. Admin, gerente e
 * Financeiro lançam; o dono (parceiro/hunter) só acompanha. O servidor normaliza o nº de série, limita a
 * 2 por aparelho e a uma série por aparelho vendido.
 */
export default function CalibracoesDaOportunidade({ oportunidadeId }: Props) {
  const { user } = useAuth();
  const papel = user?.role ?? "";
  const podeVer = PERFIS_COMISSOES.includes(papel);
  const podeLancar = PERFIS_COMISSOES_TUDO.includes(papel);

  const [dados, setDados] = useState<Dados | null>(null);
  const [serie, setSerie] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await parceriasService.listarCalibracoes(oportunidadeId));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao carregar as calibrações."));
    }
  }, [oportunidadeId]);

  useEffect(() => { if (podeVer) carregar(); }, [podeVer, carregar]);

  if (!podeVer) return null;

  const aparelhos = dados?.aparelhos ?? [];
  const semComissao = dados?.sem_comissao ?? [];
  const lancadas = aparelhos.reduce((s, ap) => s + ap.renovacoes.filter((rv) => rv.calibracao).length, 0)
    + semComissao.length;

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
    <ExpandableSection
      title="Calibrações"
      icon={<Wrench size={18} />}
      badge={lancadas}
      defaultExpanded={aparelhos.length > 0 || lancadas > 0}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cada aparelho rende comissão nas {LIMITE_CALIBRACOES} primeiras renovações (12 e 24 meses após o ganho).
          A comissão entra como pendente em Comissões → A pagar e fica paga quando o Financeiro marcar o pagamento.
        </p>

        {aparelhos.length === 0 && semComissao.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma calibração lançada.</p>
        )}

        {aparelhos.map((ap) => {
          const feitas = ap.renovacoes.filter((rv) => rv.calibracao).length;
          return (
            <div key={ap.numero} className={CAIXA}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Aparelho {ap.numero} ·{" "}
                  {ap.serial_number
                    ? <span className="font-mono">{ap.serial_number}</span>
                    : <span className="font-normal text-slate-500 dark:text-slate-400">nº de série ao lançar</span>}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    feitas >= LIMITE_CALIBRACOES
                      ? "bg-gray-500/15 text-gray-600 dark:text-gray-400"
                      : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                  }`}
                >
                  {feitas} de {LIMITE_CALIBRACOES} renovações
                </span>
              </div>
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-700/50">
                {ap.renovacoes.map((rv) => {
                  const c = rv.calibracao;
                  return (
                    <li key={rv.ordem} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{rv.ordem}ª renovação</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {c
                            ? `Calibrada em ${dataCurta(c.calibration_date)} · ${formatarMoeda(Number(c.value))}`
                            : `Prevista para ${dataCurta(rv.prevista_para)}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {c ? (
                          <>
                            {c.commission_amount != null && (
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{formatarMoeda(Number(c.commission_amount))}</span>
                            )}
                            <SituacaoDaComissao c={c} />
                          </>
                        ) : (
                          <>
                            {rv.valor_previsto != null && (
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {formatarMoeda(Number(rv.valor_previsto))} <span className="text-xs text-slate-400">(previsão)</span>
                              </span>
                            )}
                            <SeloDoPrazo iso={rv.prevista_para} />
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {semComissao.length > 0 && (
          <div className={CAIXA}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Calibrações sem comissão</p>
            <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-700/50">
              {semComissao.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-slate-900 dark:text-white">{c.serial_number}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Calibrada em {dataCurta(c.calibration_date)} · {formatarMoeda(Number(c.value))}
                    </p>
                  </div>
                  <SituacaoDaComissao c={c} />
                </li>
              ))}
            </ul>
          </div>
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
              <FormField label="Valor pago pelo cliente (R$)">
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
