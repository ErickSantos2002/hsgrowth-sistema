import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import { Button, FormField, Input } from "../common";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { PERFIS_COMISSOES, PERFIS_COMISSOES_TUDO, formatarMoeda } from "../../constants/parcerias";
import parceriasService, { mensagemDeErro, type Calibracao } from "../../services/parceriasService";

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
  const [erro, setErro] = useState<string | null>(null);
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
    setErro(null);
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
      setErro(mensagemDeErro(e, "Erro ao lançar a calibração."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ExpandableSection title="Calibrações" icon={<Wrench size={16} />} badge={itens.length} defaultExpanded={itens.length > 0}>
      <div className="space-y-3">
        {itens.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-gray-400">Nenhuma calibração lançada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Nº de série</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3 text-right">Valor</th>
                  <th className="py-2 text-right">Comissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-slate-800 dark:divide-slate-700/50 dark:text-slate-200">
                {itens.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 font-mono">{c.serial_number}</td>
                    <td className="py-2 pr-3">{new Date(`${c.calibration_date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3 text-right">{formatarMoeda(Number(c.value))}</td>
                    <td className="py-2 text-right">{c.commission_amount != null ? formatarMoeda(Number(c.commission_amount)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <FormField label="Valor (R$)">
                <Input value={valor} inputMode="decimal" placeholder="0,00" onChange={(e) => setValor(e.target.value.replace(/[^0-9,.]/g, ""))} />
              </FormField>
            </div>
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            <Button onClick={lancar} loading={salvando} disabled={!podeSalvar} fullWidth>Lançar calibração</Button>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
}
