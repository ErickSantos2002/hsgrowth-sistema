import { useEffect, useState } from "react";
import { Alert, Button, FormField, Input, LoadingSpinner } from "../../components/common";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { PERFIS_GESTAO } from "../../constants/parcerias";
import parceriasService, { mensagemDeErro, type ComissaoConfig } from "../../services/parceriasService";

// O backend manda "7.50"; na tela fica "7,5" (vírgula).
const paraCampo = (v: string | number) => String(Number(v)).replace(".", ",");
const lerNumero = (v: string): number => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
const limpar = (v: string) => v.replace(/[^0-9,]/g, "");

type Campos = { own: string; ind: string; bonus: string; meses: string; cal: string };

const dosCampos = (c: ComissaoConfig): Campos => ({
  own: paraCampo(c.own_sale_pct),
  ind: paraCampo(c.indication_pct),
  bonus: paraCampo(c.first_sale_bonus),
  meses: String(c.indication_months),
  cal: paraCampo(c.calibration_pct),
});

// Aba Comissões das Configurações: admin e gerente editam; o Financeiro só lê.
export default function ComissoesConfig() {
  const { user } = useAuth();
  const podeEditar = PERFIS_GESTAO.includes(user?.role ?? "");
  const [campos, setCampos] = useState<Campos | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    parceriasService.lerConfigComissoes()
      .then((c) => setCampos(dosCampos(c)))
      .catch((e) => showError(mensagemDeErro(e, "Erro ao carregar a configuração.")));
  }, []);

  if (!campos) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  }

  const mudar = (k: keyof Campos, v: string) => setCampos({ ...campos, [k]: v });
  const pct = (k: "own" | "ind" | "cal") => lerNumero(campos[k]);
  const meses = parseInt(campos.meses, 10);
  const valido = [pct("own"), pct("ind"), pct("cal")].every((p) => p >= 0 && p <= 100) && meses >= 1 && meses <= 120;

  const salvar = async () => {
    setSalvando(true);
    try {
      const c = await parceriasService.salvarConfigComissoes({
        own_sale_pct: pct("own"),
        indication_pct: pct("ind"),
        first_sale_bonus: lerNumero(campos.bonus),
        indication_months: meses,
        calibration_pct: pct("cal"),
      });
      setCampos(dosCampos(c));
      showSuccess("Configuração salva.");
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao salvar a configuração."));
    } finally {
      setSalvando(false);
    }
  };

  const campo = (rotulo: string, k: keyof Campos, dica: string, inteiro = false) => (
    <FormField label={rotulo}>
      <Input
        value={campos[k]}
        disabled={!podeEditar}
        inputMode={inteiro ? "numeric" : "decimal"}
        onChange={(e) => mudar(k, inteiro ? e.target.value.replace(/\D/g, "") : limpar(e.target.value))}
      />
      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{dica}</p>
    </FormField>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Configuração das comissões</h2>
        {!podeEditar && <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Somente leitura: só admin e gerente alteram.</p>}
      </div>

      <Alert type="info">Mudanças valem para as próximas vendas confirmadas; lançamentos já gerados não mudam.</Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campo("Venda própria (%)", "own", "Do parceiro/hunter sobre a venda que ele mesmo indicou.")}
        {campo("Indicação (%)", "ind", "Do hunter sobre as vendas das empresas que ele indicou.")}
        {campo("Bônus de primeira venda (R$)", "bonus", "Valor fixo, pago uma vez ao indicador.")}
        {campo("Prazo de indicação (meses)", "meses", "Quanto tempo as vendas da empresa indicada rendem comissão.", true)}
        {campo("Calibração (%)", "cal", "Sobre o valor de cada calibração (até 2 por aparelho).")}
      </div>

      {podeEditar && <Button onClick={salvar} loading={salvando} disabled={!valido}>Salvar</Button>}
    </div>
  );
}
