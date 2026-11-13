import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Alert, Button, FormField, Input, LoadingSpinner } from "../../components/common";
import { showError, showSuccess } from "../../utils/toast";
import { recarregarRegrasCnpj } from "../parcerias/RegrasSemaforo";
import parceriasService, { mensagemDeErro, type RegrasCnpj } from "../../services/parceriasService";

type Campos = { protecao: string; compra: string; perda: string; limite: string; travar: boolean };

const dosCampos = (r: RegrasCnpj): Campos => ({
  protecao: String(r.protection_days),
  compra: String(r.recent_purchase_days),
  perda: String(r.recent_loss_days),
  limite: String(r.daily_query_limit),
  travar: r.block_between_sellers,
});

// Aba "Consulta de CNPJ" das Configurações (só o admin vê): prazos do semáforo, limite e trava entre vendedores.
export default function RegrasCnpjConfig() {
  const [regras, setRegras] = useState<RegrasCnpj | null>(null);
  const [campos, setCampos] = useState<Campos | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    parceriasService.lerRegrasCnpj()
      .then((r) => { setRegras(r); setCampos(dosCampos(r)); })
      .catch((e) => showError(mensagemDeErro(e, "Erro ao carregar as regras.")));
  }, []);

  if (!campos) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  }

  const numero = (k: "protecao" | "compra" | "perda" | "limite") => parseInt(campos[k], 10);
  const diaOk = (n: number) => Number.isInteger(n) && n >= 0 && n <= 365;
  const valido = diaOk(numero("protecao")) && diaOk(numero("compra")) && diaOk(numero("perda"))
    && numero("limite") >= 1 && numero("limite") <= 1000;

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await parceriasService.salvarRegrasCnpj({
        protection_days: numero("protecao"),
        recent_purchase_days: numero("compra"),
        recent_loss_days: numero("perda"),
        daily_query_limit: numero("limite"),
        block_between_sellers: campos.travar,
      });
      recarregarRegrasCnpj();
      setRegras(r);
      setCampos(dosCampos(r));
      showSuccess("Regras salvas.");
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao salvar as regras."));
    } finally {
      setSalvando(false);
    }
  };

  const campo = (rotulo: string, k: "protecao" | "compra" | "perda" | "limite", dica: string) => (
    <FormField label={rotulo}>
      <Input
        value={campos[k]}
        inputMode="numeric"
        onChange={(e) => setCampos({ ...campos, [k]: e.target.value.replace(/\D/g, "").slice(0, 4) })}
      />
      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{dica}</p>
    </FormField>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Regras da Consulta de CNPJ</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Valem para a Consulta de CNPJ, para o cadastro de oportunidades dos parceiros e para a trava dos cards de Vendas.
        </p>
      </div>

      <Alert type="info">Use 0 dias para desligar uma regra. A mudança vale na hora, inclusive para os cards já existentes.</Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {campo("Proteção da negociação (dias)", "protecao", "Card ou oportunidade aberto com atividade agendada ou movimento nesse prazo bloqueia o CNPJ.")}
        {campo("Compra recente (dias)", "compra", "Depois de uma venda, o CNPJ fica bloqueado por esse prazo.")}
        {campo("Perda recente (dias)", "perda", "Depois de uma perda, o CNPJ fica bloqueado por esse prazo.")}
        {campo("Consultas por dia", "limite", "Por login de parceiro ou hunter. A H&S não tem limite.")}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
        <input
          type="checkbox"
          checked={campos.travar}
          onChange={(e) => setCampos({ ...campos, travar: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-slate-900 dark:text-white">Travar card de Vendas entre vendedores</span>
          <span className="block text-xs text-slate-500 dark:text-gray-400">
            O vendedor não cria card com CNPJ que outro vendedor está trabalhando (mesmas regras acima). O card do próprio
            vendedor e os leads automáticos não contam. Admin e gerente liberam com justificativa.
          </span>
        </span>
      </label>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          {regras?.updated_by_name && regras.updated_at
            ? `Alterado por ${regras.updated_by_name} em ${new Date(`${regras.updated_at}${/[zZ]|[+-]\d\d:?\d\d$/.test(regras.updated_at) ? "" : "Z"}`).toLocaleDateString("pt-BR")}`
            : "Valores padrão do sistema."}
        </p>
        <Button icon={<Save size={16} />} onClick={salvar} loading={salvando} disabled={!valido}>Salvar Alterações</Button>
      </div>
    </div>
  );
}
